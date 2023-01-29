const constraints = {
  audio: false,
  video: { width: 1280, height: 720 }
};

const video = document.querySelector('video');

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo)

function startVideo() {
  navigator.mediaDevices.getUserMedia(constraints)
  .then((mediaStream) => {
    video.srcObject = mediaStream;
    video.onloadedmetadata = () => {
      video.play();
    };
  })
  .catch((err) => {
    // always check for errors at the end.
    console.error(`${err.name}: ${err.message}`);
  });

}
const emotes = [
  {name: 'neutral', emoji:'🙂', confidence:0},
  {name: 'happy', emoji:'😃', confidence:0},
  {name: 'sad', emoji:'😢', confidence:0},
  {name: 'angry', emoji:'😠', confidence:0},
  // {name: 'fearful', emoji:'😨', confidence:0},
  {name: 'disgusted', emoji:'😩', confidence:0},
  {name: 'surprised', emoji:'😯', confidence:0},
];

const facesDiv = document.querySelector('div');

for (const emote of emotes) {
  const span = document.createElement('span');
  span.className = emote.name;
  span.textContent = emote.emoji;
  facesDiv.append(span);

  const img = new Image();
  img.className = emote.name;
  document.querySelector('.gallery').append(img);
}

const generatePrompt = () => {
  let item = emotes.find( item => item.confidence == 0);
  let prompt = `${item.name}`;
  
  myprompt.textContent = prompt;
  myprompt.dataset.emoji = (emotes.find( item => item.name == prompt).emoji);

  return item;
}

let currentPrompt = generatePrompt();


function cap(expression) {
  let canvas = document.getElementById('canvas');
  let video = document.getElementById('video');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, video.videoWidth, video.videoHeight); // for drawing the video element on the canvas
    
  canvas.toBlob((blob) => { 
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      // no longer need to read the blob so it's revoked
      URL.revokeObjectURL(url);
    }
    img.src = url;
    const gallery = document.querySelector('.gallery');
    const targetImage = gallery.querySelector(`img.${expression}`);
    targetImage.src = img.src;
    targetImage.scrollIntoView({behavior:"smooth"});
    
  });
}

video.addEventListener('play', () => {
  // const canvas1 = faceapi.createCanvasFromMedia(video)
  // document.body.append(canvas1)
  
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)
  facesInterval = setInterval(async () => {
    
    if (!currentPrompt) {
      document.querySelector('h1').style.opacity = 0;
      video.style.opacity = 0;
      clearInterval(facesInterval);
    }

    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 })).withFaceLandmarks().withFaceExpressions()
    const resizedDetections = faceapi.resizeResults(detections, displaySize)
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    //faceapi.draw.drawDetections(canvas, resizedDetections)
    try {
      const expressions = resizedDetections[0].expressions;
      const keys = Object.keys(expressions);

      keys.map( (key) => {
        
        if (currentPrompt && currentPrompt.confidence !==1 && expressions[currentPrompt.name] > 0.65) {
          emotes.find( item => item.name == key).confidence = 1;
          cap(currentPrompt.name);
          document.querySelector(`.faces span.${currentPrompt.name}`).classList.add('success');
          console.log("WELL DONE!", resizedDetections[0], resizedDetections[0].landmarks.getNose());
          currentPrompt = generatePrompt();
        }
      });
    } catch (e) {
      console.log(currentPrompt)
      console.error(e);
      console.error(resizedDetections);
      // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
    }
  }, 1000).bind(this)
});