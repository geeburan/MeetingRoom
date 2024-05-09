let APP_ID = "948638a548ef4db39cd2b07c0011bd04";

let token = null;
let uid = String(Math.floor(Math.random() * 1000));

let client;
let channel;

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

if(!roomId){
    window.location = 'lobby.html'
}

let localStream;
let remoteStream;
let peerConnection;

let constraints = {
  video:{
    width:{min:640, ideal:1920, max:1920},
    heigth:{min:480, ideal:1080, max:1080},
  },
  audio:true
}

const servers = {
  iceServers: [
    {
      urls: ["stun.stunprotocol.org:3478,"],
    },
  ],
};

let init = async () => {
  client = await AgoraRTM.createInstance(APP_ID)
  await client.login({uid, token})

  channel = client.createChannel(roomId)
  await channel.join()
  

  channel.on('MemberJoined', handleUserJoined)
  channel.on('MemberLeft', handleUserLeft)
  client.on('MessageFromPeer', handleMessageFromPeer)

  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  document.getElementById('user-1').srcObject = localStream;
};

let handleUserLeft = (memberId) => {
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('small-frame')
    
}

let handleMessageFromPeer = async (message, memberId) => {
    message = JSON.parse(message.text)
  
    if (message.type == 'offer') {
      await createPeerConnection(memberId)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
      let answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'answer': answer }) }, memberId)
    }
    if (message.type == 'answer') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    }
    if (message.type == 'candidate') {
      await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
};

let handleUserJoined = async (memberId) => {
  console.log('A new user joined the channel:', memberId)
  await createPeerConnection(memberId)
  let offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)
  client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, memberId)
};

let createPeerConnection = async (memberId) => {
    peerConnection = new RTCPeerConnection(servers)
  
    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block'
    document.getElementById('user-1').classList.add('small-frame')

    if (!localStream) {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      document.getElementById('user-1').srcObject = localStream
    }
  
    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track)
      })
    };
  
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, memberId)
      }
    }
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
      })
};



let addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }
};

let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

let toggleCamera = async () => {
  let videoTrack = localStream.getTracks().find(track => track.kind == 'video')

  if(videoTrack.enabled){
      videoTrack.enabled = false
      document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  }else{
      videoTrack.enabled = true
      document.getElementById('camera-btn').style.backgroundColor = 'rgb(32,32,32)'
  }
}

let toggleMic = async () => {
  let audioTrack = localStream.getTracks().find(track => track.kind == 'audio')

  if(audioTrack.enabled){
      audioTrack.enabled = false
      document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  }else{
      audioTrack.enabled = true
      document.getElementById('mic-btn').style.backgroundColor = 'rgb(32,32,32)'
  }
}

window.addEventListener('beforeunload', leaveChannel)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
init();
