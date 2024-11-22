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
        facingMode: { ideal: 'environment' } // 外側カメラを使用
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
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // グレースケール化と適応的な二値化の前処理（Otsu法の簡易版）
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let histogram = new Array(256).fill(0);

  // ヒストグラムの作成
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    histogram[Math.floor(avg)]++;
  }

  // Otsuのしきい値計算
  let total = canvas.width * canvas.height;
  let sumB = 0;
  let wB = 0;
  let maximum = 0;
  let sum1 = histogram.reduce((sum, value, index) => sum + index * value, 0);
  let threshold = 0;

  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;
    let wF = total - wB;
    if (wF === 0) break;
    sumB += i * histogram[i];
    let mB = sumB / wB;
    let mF = (sum1 - sumB) / wF;
    let between = wB * wF * Math.pow(mB - mF, 2);
    if (between > maximum) {
      maximum = between;
      threshold = i;
    }
  }

  // 二値化処理
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const binarizedValue = avg > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = binarizedValue;
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
    liveOcrTextDiv.innerHTML = '読み取り中にエラーが発生しました。';
  });
}, 1000);

// 写真を撮る機能
captureButton.addEventListener('click', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // グレースケール化と適応的な二値化の前処理（Otsu法の簡易版）
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let histogram = new Array(256).fill(0);

  // ヒストグラムの作成
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    histogram[Math.floor(avg)]++;
  }

  // Otsuのしきい値計算
  let total = canvas.width * canvas.height;
  let sumB = 0;
  let wB = 0;
  let maximum = 0;
  let sum1 = histogram.reduce((sum, value, index) => sum + index * value, 0);
  let threshold = 0;

  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;
    let wF = total - wB;
    if (wF === 0) break;
    sumB += i * histogram[i];
    let mB = sumB / wB;
    let mF = (sum1 - sumB) / wF;
    let between = wB * wF * Math.pow(mB - mF, 2);
    if (between > maximum) {
      maximum = between;
      threshold = i;
    }
  }

  // 二値化処理
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const binarizedValue = avg > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = binarizedValue;
  }
  context.putImageData(imageData, 0, 0);

  const processedImageData = canvas.toDataURL('image/png');
  performOCR(processedImageData);
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
