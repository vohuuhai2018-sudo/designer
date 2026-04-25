const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://vohuuhai2018_db_user:9orUDwAh28XgzxdJ@cluster0.kxamnse.mongodb.net/landscape_db?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('landscape_db');
    
    const thumbs = {
      'HIEN_DAI': '/assets/Nội thất/1. HIEN DAI _ THUMB.png',
      'TAN_CO_DIEN': '/assets/Nội thất/2. TAN CO DIEN_THUMB.png',
      'INDOCHINE': '/assets/Nội thất/3. INDOCHINE_THUMB.png',
      'WABI_SABI': '/assets/Nội thất/4. WABI SABI_THUMB.png',
      'TAN_CO_DIEN_GO': '/assets/Nội thất/5. NOI THAT GO_THUMB.png'
    };
    
    const sc = await db.collection('systemcontents').findOne({});
    if (!sc || !sc.library) {
      console.log('No systemcontent found');
      return;
    }
    
    const updates = {};
    
    for (const [key, thumb] of Object.entries(thumbs)) {
      const existing = sc.library[key] || [];
      if (existing.length > 0) {
        const updated = existing.map(item => {
          const imgs = item.images || Array(4).fill(item.url || thumb);
          const newItem = { ...item, images: imgs };
          if (newItem.variants) {
            newItem.variants = newItem.variants.map(v => ({
              ...v,
              images: v.images || Array(4).fill(v.url || thumb)
            }));
          }
          return newItem;
        });
        updates['library.' + key] = updated;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      const result = await db.collection('systemcontents').updateOne({}, { $set: updates });
      console.log('Updated', result.modifiedCount, 'document(s).');
      console.log('Fields updated:', Object.keys(updates).join(', '));
    } else {
      console.log('No updates needed');
    }
    
    // Verify
    const verify = await db.collection('systemcontents').findOne({});
    for (const key of Object.keys(thumbs)) {
      const items = verify.library[key] || [];
      for (const item of items) {
        const hasImages = item.images && item.images.length > 0;
        const variantImages = item.variants && item.variants.every(v => v.images && v.images.length > 0);
        console.log(`  ${key}/${item.id}: parent.images=${hasImages}, allVariantsHaveImages=${variantImages}`);
      }
    }
    
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await client.close();
  }
}

run();
