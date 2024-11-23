// 要素の取得
const video = document.getElementById('camera');
const canvas = document.getElementById('snapshot');
const captureButton = document.getElementById('capture');
const detailsDiv = document.getElementById('results');
const homeButton = document.getElementById('home');
const liveOcrTextDiv = document.getElementById('live-ocr-text');

const cameraScreen = document.getElementById('camera-screen');
const resultsScreen = document.getElementById('results-screen');

const box = document.getElementById('recognition-box');
let isDragging = false;
let startX, startY;

// ドラッグ機能の実装
box.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  const rect = box.getBoundingClientRect();
  const parentRect = box.parentElement.getBoundingClientRect();

  let newLeft = rect.left + dx;
  let newTop = rect.top + dy;

  // 親要素内に収める
  if (newLeft < parentRect.left) newLeft = parentRect.left;
  if (newTop < parentRect.top) newTop = parentRect.top;
  if (newLeft + rect.width > parentRect.right) newLeft = parentRect.right - rect.width;
  if (newTop + rect.height > parentRect.bottom) newTop = parentRect.bottom - rect.height;

  box.style.left = `${newLeft - parentRect.left}px`;
  box.style.top = `${newTop - parentRect.top}px`;
  startX = e.clientX;
  startY = e.clientY;
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

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

// OpenCV.jsを使用した前処理関数
function preprocessImage(canvasElement) {
  return new Promise((resolve, reject) => {
    if (typeof cv === 'undefined') {
      reject('OpenCV.jsが読み込まれていません。');
      return;
    }

    try {
      let src = cv.imread(canvasElement);
      let gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

      // ノイズ除去
      cv.medianBlur(gray, gray, 3);

      // バイナリ化
      cv.threshold(gray, gray, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

      cv.imshow(canvasElement, gray);
      src.delete(); gray.delete();
      resolve(canvasElement.toDataURL('image/png'));
    } catch (err) {
      reject(err);
    }
  });
}

// JSONデータの読み込み
let additivesData = [];
fetch('data.json')
  .then(response => response.json())
  .then(data => {
    additivesData = data;
  })
  .catch(error => {
    console.error('JSONデータの読み込みに失敗しました:', error);
  });

// 定期的にOCRを実行して読み取り中の文字を表示
setInterval(() => {
  try {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    // 認識領域の座標とサイズを取得
    const boxRect = box.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    const scaleX = video.videoWidth / videoRect.width;
    const scaleY = video.videoHeight / videoRect.height;

    const boxWidth = boxRect.width * scaleX;
    const boxHeight = boxRect.height * scaleY;
    const boxLeft = (boxRect.left - videoRect.left) * scaleX;
    const boxTop = (boxRect.top - videoRect.top) * scaleY;

    canvas.width = boxWidth;
    canvas.height = boxHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, boxLeft, boxTop, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight);

    preprocessImage(canvas).then(processedImageData => {
      Tesseract.recognize(
        processedImageData,
        'jpn',
        {
          logger: info => console.log(info),
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
        }
      ).then(({ data: { text } }) => {
        liveOcrTextDiv.innerHTML = text;
      }).catch(err => {
        liveOcrTextDiv.innerHTML = '読み取り中にエラーが発生しました: ' + err.message;
        console.error('読み取り中にエラーが発生しました:', err);
      });
    }).catch(err => {
      liveOcrTextDiv.innerHTML = '前処理中にエラーが発生しました: ' + err.message;
      console.error('前処理中にエラーが発生しました:', err);
    });
  } catch (error) {
    liveOcrTextDiv.innerHTML = 'エラーが発生しました: ' + error.message;
    console.error('エラーが発生しました:', error);
  }
}, 1000);

// 写真を撮る機能
captureButton.addEventListener('click', () => {
  try {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert('ビデオが初期化されていません。しばらく待ってから再試行してください。');
      return;
    }

    // 認識領域の座標とサイズを取得
    const boxRect = box.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    const scaleX = video.videoWidth / videoRect.width;
    const scaleY = video.videoHeight / videoRect.height;

    const boxWidth = boxRect.width * scaleX;
    const boxHeight = boxRect.height * scaleY;
    const boxLeft = (boxRect.left - videoRect.left) * scaleX;
    const boxTop = (boxRect.top - videoRect.top) * scaleY;

    canvas.width = boxWidth;
    canvas.height = boxHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, boxLeft, boxTop, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight);

    preprocessImage(canvas).then(processedImageData => {
      performOCR(processedImageData);
    }).catch(err => {
      liveOcrTextDiv.innerHTML = '前処理中にエラーが発生しました: ' + err.message;
      console.error('前処理中にエラーが発生しました:', err);
    });
  } catch (error) {
    liveOcrTextDiv.innerHTML = 'エラーが発生しました: ' + error.message;
    console.error('エラーが発生しました:', error);
  }
});

// OCR実行
async function performOCR(imageData) {
  detailsDiv.innerHTML = '読み取り中...';
  const TesseractInstance = window.Tesseract;
  if (!TesseractInstance) {
    detailsDiv.innerHTML = 'OCRライブラリが読み込まれていません。';
    alert('OCRライブラリが読み込まれていません。');
    return;
  }

  TesseractInstance.recognize(
    imageData,
    'jpn',
    {
      logger: info => console.log(info),
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
    }
  ).then(({ data: { text } }) => {
    searchAdditiveDetails(text);
  }).catch(err => {
    detailsDiv.innerHTML = '読み取りに失敗しました: ' + err.message;
    console.error('読み取りに失敗しました:', err);
    alert('読み取りに失敗しました: ' + err.message);
  });
}

// 添加物名から詳細を検索
function searchAdditiveDetails(text) {
  const additiveNames = text.trim().split(/\s+/);
  let resultsHTML = '';

  additiveNames.forEach(additiveName => {
    const additive = additivesData.find(item => 
      item.添加物名.includes(additiveName) || 
      (item.別名 && item.別名.some(alias => alias.includes(additiveName)))
    );
    if (additive) {
      resultsHTML += `<div>
        <h2>${additive.添加物名}</h2>
        <p><strong>メリット:</strong> ${additive.メリット}</p>
        <p><strong>デメリット:</strong> ${additive.デメリット}</p>
        <p><a href="${additive.関連リンク}" target="_blank">参考リンク</a></p>
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
