const express = require('express');
const fs = require('fs/promises');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const { runChatGptAutomation } = require('./chatgptAutomation');
const { generateLandscapePrompt } = require('./geminiPromptService');

const app = express();
const PORT = process.env.PORT || 5000;

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema
const ProjectSchema = new mongoose.Schema({
  id: String,
  timestamp: { type: Date, default: Date.now },
  customerName: String,
  customerPhone: String,
  rawImage: String,
  annotatedImage: String,
  selections: {
    thac: String,
    ke: [String],
    canh: [String]
  },
  service: String,
  status: { type: String, default: 'pending' },
  note: String,
  extraAssets: [String],
  workflowBranch: String,
  finalImage: String,
  aiResults: [String]
});

const Project = mongoose.model('Project', ProjectSchema);

// Helper: Upload to Cloudinary
const uploadToCloudinary = async (fileStr) => {
  if (!fileStr || fileStr.startsWith('http')) return fileStr;
  try {
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      folder: 'landscape_app',
      resource_type: 'auto' // handles both images and videos
    });
    return uploadResponse.secure_url;
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    return fileStr; // Fallback to original
  }
};

// API Routes
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ timestamp: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const data = req.body;
    console.log('Uploading images to Cloudinary...');

    // 1. Upload Raw Image
    data.rawImage = await uploadToCloudinary(data.rawImage);
    
    // 2. Upload Annotated Image
    data.annotatedImage = await uploadToCloudinary(data.annotatedImage);
    
    // 3. Upload Extra Assets
    if (data.extraAssets && data.extraAssets.length > 0) {
      data.extraAssets = await Promise.all(
        data.extraAssets.map(asset => uploadToCloudinary(asset))
      );
    }

    const newProject = new Project(data);
    await newProject.save();
    console.log('Project saved to MongoDB with Cloudinary links');
    res.status(201).json(newProject);
  } catch (err) {
    console.error('Submission error:', err);
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/projects/:id', async (req, res) => {
  try {
    const updates = {};

    if (typeof req.body.status === 'string') {
      updates.status = req.body.status;
    }

    if (typeof req.body.workflowBranch === 'string') {
      updates.workflowBranch = req.body.workflowBranch;
    }

    if (req.body.finalImage) {
      updates.finalImage = await uploadToCloudinary(req.body.finalImage);
    }

    const updated = await Project.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/projects/:id/ai-prompt', async (req, res) => {
  try {
    const { assets } = req.body;

    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: 'Thiếu dữ liệu tài nguyên để AI sinh prompt.' });
    }

    const project = await Project.findOne({ id: req.params.id }).lean();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const prompt = await generateLandscapePrompt(project, assets);
    res.json({ prompt });
  } catch (err) {
    console.error('AI prompt generation error:', err);
    res.status(500).json({ error: err.message || 'Không thể sinh prompt bằng AI.' });
  }
});

app.post('/api/projects/:id/chatgpt-generate', async (req, res) => {
  let outputPath;

  try {
    const { prompt, assets } = req.body;

    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: 'Thiếu danh sách ảnh tài nguyên để upload.' });
    }

    const project = await Project.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status !== 'done') {
      project.status = 'processing';
      await project.save();
    }

    const resolvedPrompt = typeof prompt === 'string' && prompt.trim()
      ? prompt.trim()
      : await generateLandscapePrompt(project.toObject(), assets);

    const automationResult = await runChatGptAutomation({ prompt: resolvedPrompt, assets });
    outputPath = automationResult.outputPath;

    const uploadedResult = await uploadToCloudinary(outputPath);
    if (!uploadedResult || !uploadedResult.startsWith('http')) {
      throw new Error('Không upload được ảnh kết quả lên Cloudinary.');
    }

    const updated = await Project.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          workflowBranch: 'chatgpt_image',
          status: 'done',
          finalImage: uploadedResult
        },
        $push: { aiResults: uploadedResult }
      },
      { new: true }
    );

    res.json({
      project: updated,
      prompt: resolvedPrompt,
      outputUrl: uploadedResult,
      chatUrl: automationResult.chatUrl
    });
  } catch (err) {
    console.error('ChatGPT generation error:', err);
    res.status(500).json({ error: err.message || 'Không thể tự động tạo ảnh với ChatGPT.' });
  } finally {
    if (outputPath) {
      await fs.unlink(outputPath).catch(() => null);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
