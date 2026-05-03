// Browser-context source. Injected into a logged-in labs.google page via page.addInitScript
// or page.evaluate. Exposes window.FlowClient with generateImages(...).
// Keep this as a self-executing string so it can be inlined in serverless bundles.

export const FLOW_CLIENT_SRC = `(() => {
  const RECAPTCHA_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
  const RECAPTCHA_ACTION = 'IMAGE_GENERATION';
  const GEN_HOST = 'https://aisandbox-pa.googleapis.com';
  const TRPC_HOST = '/fx/api/trpc';
  const ASPECT_MAP = {
    LANDSCAPE: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
    PORTRAIT: 'IMAGE_ASPECT_RATIO_PORTRAIT',
    SQUARE: 'IMAGE_ASPECT_RATIO_SQUARE',
  };
  async function getAccessToken() {
    const sess = await fetch('/fx/api/auth/session', { credentials: 'include' }).then(r => r.json());
    if (!sess?.access_token) throw new Error('Not authenticated — run \`flow-gen login\` first');
    return sess.access_token;
  }
  async function getRecaptchaToken() {
    return await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action: RECAPTCHA_ACTION });
  }
  async function ensureProject({ projectId, projectTitle } = {}) {
    if (projectId) return projectId;
    const fromUrl = location.pathname.match(/project\\/([a-f0-9-]+)/)?.[1];
    if (fromUrl) return fromUrl;
    const title = projectTitle || ('cli-' + new Date().toISOString().slice(0, 19));
    const res = await fetch(TRPC_HOST + '/project.createProject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ json: { projectTitle: title, toolName: 'PINHOLE' } }),
    });
    const json = await res.json();
    const id = json?.result?.data?.json?.result?.projectId;
    if (!id) throw new Error('createProject failed: ' + JSON.stringify(json));
    return id;
  }
  async function generateOne({ accessToken, projectId, prompt, aspectRatio, seed, batchId, sessionId }) {
    const recaptchaToken = await getRecaptchaToken();
    const recaptchaContext = { token: recaptchaToken, applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB' };
    const body = {
      clientContext: { recaptchaContext, projectId, tool: 'PINHOLE', sessionId },
      mediaGenerationContext: { batchId },
      useNewMedia: true,
      requests: [{
        clientContext: { recaptchaContext, projectId, tool: 'PINHOLE', sessionId },
        imageModelName: 'NARWHAL',
        imageAspectRatio: ASPECT_MAP[aspectRatio] || ASPECT_MAP.LANDSCAPE,
        structuredPrompt: { parts: [{ text: prompt }] },
        seed, imageInputs: [],
      }],
    };
    const res = await fetch(GEN_HOST + '/v1/projects/' + projectId + '/flowMedia:batchGenerateImages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error('gen failed'), { status: res.status, body: json });
    const m = json?.media?.[0];
    return {
      mediaId: m.name, workflowId: m.workflowId,
      fifeUrl: m.image?.generatedImage?.fifeUrl,
      width: m.image?.dimensions?.width, height: m.image?.dimensions?.height,
      seed: m.image?.generatedImage?.seed,
    };
  }
  async function generateImages({ prompt, count = 1, aspectRatio = 'LANDSCAPE', projectId, projectTitle } = {}) {
    if (!prompt) throw new Error('prompt is required');
    const t0 = Date.now();
    const [accessToken, ensuredProjectId] = await Promise.all([
      getAccessToken(),
      ensureProject({ projectId, projectTitle }),
    ]);
    const batchId = crypto.randomUUID();
    const sessionId = ';' + Date.now();
    const tasks = Array.from({ length: count }, () => generateOne({
      accessToken, projectId: ensuredProjectId, prompt, aspectRatio,
      seed: Math.floor(Math.random() * 999999), batchId, sessionId,
    }));
    const settled = await Promise.allSettled(tasks);
    const images = settled.filter(s => s.status === 'fulfilled').map(s => s.value);
    const errors = settled.filter(s => s.status === 'rejected').map(s => ({
      message: s.reason?.message, status: s.reason?.status, body: s.reason?.body,
    }));
    return { projectId: ensuredProjectId, elapsedMs: Date.now() - t0, requested: count, received: images.length, images, errors };
  }
  window.FlowClient = { generateImages, getAccessToken, getRecaptchaToken, ensureProject };
})();`;
