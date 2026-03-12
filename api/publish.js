export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { markdown, filename, password } = req.body;

  // 비밀번호 확인
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
  }

  if (!markdown || !filename) {
    return res.status(400).json({ error: '마크다운 내용과 파일명이 필요합니다.' });
  }

  // 파일명 정리
  const safeName = filename.replace(/[^a-z0-9\-]/gi, '-').toLowerCase();
  const finalName = safeName.endsWith('.md') ? safeName : `${safeName}.md`;
  const path = `src/content/article/${finalName}`;

  // 제목 추출
  const titleMatch = markdown.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  const title = titleMatch ? titleMatch[1] : finalName;

  const token = process.env.GITHUB_TOKEN;
  const owner = 'sleebees-sellerbiz';
  const repo = 'blog';

  try {
    // 같은 파일이 이미 있는지 확인
    const checkRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    let sha;
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    // GitHub API로 커밋
    const content = Buffer.from(markdown, 'utf-8').toString('base64');
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `[PUBLISH] ${title}`,
          content,
          ...(sha ? { sha } : {}),
        }),
      }
    );

    if (!commitRes.ok) {
      const error = await commitRes.json();
      return res.status(500).json({
        error: `GitHub 커밋 실패: ${error.message}`,
      });
    }

    const result = await commitRes.json();
    return res.status(200).json({
      success: true,
      message: `"${title}" 발행 완료!`,
      url: result.content.html_url,
      filename: finalName,
    });
  } catch (err) {
    return res.status(500).json({ error: `서버 오류: ${err.message}` });
  }
}
