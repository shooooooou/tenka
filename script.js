<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>添加物検索アプリ</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="camera-screen" class="screen">
    <h1>食品添加物検索アプリ</h1>
    <video id="camera" autoplay></video>
    <canvas id="snapshot"></canvas>
    <button id="capture">読み取り開始</button>
  </div>

  <div id="results-screen" class="screen" style="display: none;">
    <h1>検索結果</h1>
    <div id="results"></div>
    <button id="home">ホームに戻る</button>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@v2.1.1/dist/tesseract.min.js"></script>
  <script src="script.js"></script>
</body>
</html>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('camera');
  const canvas = document.getElementById('snapshot');
  const captureButton = document.getElementById('capture');
  const detailsDiv = document.getElementById('results');
  const homeButton = document.getElementById('home');

  const cameraScreen = document.getElementById('camera-screen');
  const resultsScreen = document.getElementById('results-screen');

  // カメラアクセス設定
  async function setupCamera() {
    try {
      const constraints = {
        video: {
          facingMode: { exact: 'environment' } // 外側カメラを使用
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
    } catch (err) {
      alert('カメラのアクセスに失敗しました: ' + err.message);
    }
  }

  setupCamera();

  // 写真を撮る機能
  captureButton.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    // OCR処理（Tesseract.jsなどのOCRライブラリを利用する）
    const imageData = canvas.toDataURL('image/png');
    performOCR(imageData);
  });

  // OCR実行
  async function performOCR(imageData) {
    detailsDiv.innerHTML = '読み取り中...';
    const Tesseract = window.Tesseract;
    if (!Tesseract) {
      detailsDiv.innerHTML = 'OCRライブラリが読み込まれていません。';
      return;
    }

    Tesseract.recognize(
      imageData,
      'jpn',
      {
        logger: info => console.log(info),
      }
    ).then(({ data: { text } }) => {
      searchAdditiveDetails(text);
    }).catch(err => {
      detailsDiv.innerHTML = '読み取りに失敗しました: ' + err.message;
    });
  }

  // 添加物名から詳細を検索
  function searchAdditiveDetails(text) {
    const additives = {
      '保存料': {
        name: '保存料',
        merit: '食品の腐敗を防ぐために使用される添加物。',
        demerit: '一部の保存料にはアレルギー反応を引き起こす可能性があります。',
        link: 'https://example.com/preservatives'
      },
      '着色料': {
        name: '着色料',
        merit: '食品に色を付けるために使用される。',
        demerit: '過剰摂取により健康への悪影響が懸念されることがあります。',
        link: 'https://example.com/colorants'
      },
      '香料': {
        name: '香料',
        merit: '食品に香りを付けるための添加物。',
        demerit: '人工香料は一部の人にとって刺激となる場合があります。',
        link: 'https://example.com/flavoring'
      }
    };

    const additiveNames = text.trim().split(/\s+/);
    let resultsHTML = '';

    additiveNames.forEach(additiveName => {
      if (additives[additiveName]) {
        const additive = additives[additiveName];
        resultsHTML += `<div>
          <h2>${additive.name}</h2>
          <p><strong>メリット:</strong> ${additive.merit}</p>
          <p><strong>デメリット:</strong> ${additive.demerit}</p>
          <p><a href="${additive.link}" target="_blank">参考リンク</a></p>
        </div>`;
      }
    });

    if (resultsHTML) {
      detailsDiv.innerHTML = resultsHTML;
    } else {
      detailsDiv.innerHTML = '詳細が見つかりませんでした。別の名前で検索してください。';
    }

    // 結果画面に移動
    cameraScreen.style.display = 'none';
    resultsScreen.style.display = 'block';
  }

  // ホームに戻るボタンの機能
  homeButton.addEventListener('click', () => {
    resultsScreen.style.display = 'none';
    cameraScreen.style.display = 'block';
  });
});
</script>

