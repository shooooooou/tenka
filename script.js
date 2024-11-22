const video = document.getElementById('camera');
const canvas = document.getElementById('snapshot');
const captureButton = document.getElementById('capture');
const detailsDiv = document.getElementById('results');
const homeButton = document.getElementById('home');
const liveOcrTextDiv = document.getElementById('live-ocr-text');

const cameraScreen = document.getElementById('camera-screen');
const resultsScreen = document.getElementById('results-screen');

// カメラアクセス設定
async function setupCamera() {
  try {
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' }, // 外側カメラを使用
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
  } catch (err) {
    alert('カメラのアクセスに失敗しました: ' + err.message);
  }
}

setupCamera();

// 定期的にOCRを実行して読み取り中の文字を表示
setInterval(() => {
  try {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return; // ビデオの初期化が完了していない場合はスキップ
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // グレースケール化、コントラスト強調、ガウスぼかしの前処理
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // グレースケール化
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = data[i + 1] = data[i + 2] = avg;
    }

    // コントラスト強調
    const contrast = 1.5; // コントラスト倍率
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128));
      data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128));
      data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128));
    }

    // ガウスぼかし（簡易版）
    const kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ];
    const kernelWeight = 16;
    const tempData = new Uint8ClampedArray(data);
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        let r = 0, g = 0, b = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            if (ny < 0 || ny >= canvas.height || nx < 0 || nx >= canvas.width) continue; // インデックス範囲チェック
            const pixelIndex = (ny * canvas.width + nx) * 4;
            const weight = kernel[ky + 1][kx + 1];
            r += tempData[pixelIndex] * weight;
            g += tempData[pixelIndex + 1] * weight;
            b += tempData[pixelIndex + 2] * weight;
          }
        }
        const index = (y * canvas.width + x) * 4;
        data[index] = r / kernelWeight;
        data[index + 1] = g / kernelWeight;
        data[index + 2] = b / kernelWeight;
      }
    }

    context.putImageData(imageData, 0, 0);

    const processedImageData = canvas.toDataURL('image/png');
    Tesseract.recognize(
      processedImageData,
      'jpn',
      {
        logger: info => console.log(info),
      }
    ).then(({ data: { text } }) => {
      liveOcrTextDiv.innerHTML = text;
    }).catch(err => {
      liveOcrTextDiv.innerHTML = '読み取り中にエラーが発生しました: ' + err.message;
      alert('読み取り中にエラーが発生しました: ' + err.message);
    });
  } catch (error) {
    liveOcrTextDiv.innerHTML = 'エラーが発生しました: ' + error.message;
    alert('エラーが発生しました: ' + error.message);
  }
}, 1000);

// 写真を撮る機能
captureButton.addEventListener('click', () => {
  try {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert('ビデオが初期化されていません。しばらく待ってから再試行してください。');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // グレースケール化、コントラスト強調、ガウスぼかしの前処理
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // グレースケール化
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = data[i + 1] = data[i + 2] = avg;
    }

    // コントラスト強調
    const contrast = 1.5; // コントラスト倍率
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, contrast * (data[i] - 128) + 128));
      data[i + 1] = Math.min(255, Math.max(0, contrast * (data[i + 1] - 128) + 128));
      data[i + 2] = Math.min(255, Math.max(0, contrast * (data[i + 2] - 128) + 128));
    }

    // ガウスぼかし（簡易版）
    const kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ];
    const kernelWeight = 16;
    const tempData = new Uint8ClampedArray(data);
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        let r = 0, g = 0, b = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            if (ny < 0 || ny >= canvas.height || nx < 0 || nx >= canvas.width) continue; // インデックス範囲チェック
            const pixelIndex = (ny * canvas.width + nx) * 4;
            const weight = kernel[ky + 1][kx + 1];
            r += tempData[pixelIndex] * weight;
            g += tempData[pixelIndex + 1] * weight;
            b += tempData[pixelIndex + 2] * weight;
          }
        }
        const index = (y * canvas.width + x) * 4;
        data[index] = r / kernelWeight;
        data[index + 1] = g / kernelWeight;
        data[index + 2] = b / kernelWeight;
      }
    }

    context.putImageData(imageData, 0, 0);

    const processedImageData = canvas.toDataURL('image/png');
    performOCR(processedImageData);
  } catch (error) {
    liveOcrTextDiv.innerHTML = 'エラーが発生しました: ' + error.message;
    alert('エラーが発生しました: ' + error.message);
  }
});

// OCR実行
async function performOCR(imageData) {
  detailsDiv.innerHTML = '読み取り中...';
  const Tesseract = window.Tesseract;
  if (!Tesseract) {
    detailsDiv.innerHTML = 'OCRライブラリが読み込まれていません。';
    alert('OCRライブラリが読み込まれていません。');
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
    alert('読み取りに失敗しました: ' + err.message);
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
