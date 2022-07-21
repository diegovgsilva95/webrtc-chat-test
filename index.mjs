const $ = document.querySelector.bind(document);

window.dom_select = function(obj){
    let r = document.createRange();
    r.selectNodeContents(obj);
    let s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
};

await new Promise(res => window.onload = res);

// Create the connection
const conn = new RTCPeerConnection({
    iceServers: []
});

conn_watchevents();
conn_defaults();


// Wait for a choice
if(await getMode()){ 
    
    
    
    
    
    
    // Mode: initiator

    // Step 0: Create data channel
    conn_datachan(conn.createDataChannel('data'));

    // Step 1: Create an offer
    /// CONN
    let offer = await conn.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
    });

    console.log(`[INIT] Generated offer: `, offer);

    console.log(`[INIT] Set local offer`);
    await conn.setLocalDescription(offer);

    await sleep(10);

    // Show offer to user
    initiator_setOffer();

    // Await for the answer
    console.log(`[INIT] Await answer...`);
    let answer = null;
    do {
        answer = await initiator_answer();
    } while(answer == null);

    // Got the answer 
    /// CONN
    console.log(`[INIT] Got answer: `, answer);
    await conn.setRemoteDescription(answer);
    console.log(`[INIT] Bound answer`);










} else { 
    
    
    
    
    
    
    
    // Mode: peer

    // Step 1: await for the offer
    console.log(`[PEER] Awaiting an offer...`);
    let offer = null;
    do {
        offer = await peer_offer();
    } while(offer == null);
    
    // Got the offer, set it.
    console.log(`[PEER] Got a remote offer: `, offer);

    await conn.setRemoteDescription(offer);
    console.log(`[PEER] Accepted remote offer`);

    // await sleep(10);


    // Step 2: generate an answer
    let answer = await conn.createAnswer();
    console.log(`[PEER] Generated answer: `, answer)

    await conn.setLocalDescription(answer)
    console.log(`[PEER] Bound local answer`);

    // Waiting list
    await sleep(10);

    //Show the answer
    peer_showAnswer(answer);
};








function getMode(){
    return new Promise(res => {
        document.querySelector(".choice-initiator").onclick = function(){
            document.querySelector(".steps-choice").classList.add("d-none");
            document.querySelector(".initiator").classList.remove("d-none");
            res(true);
        };

        document.querySelector(".choice-peer").onclick = function(){
            document.querySelector(".steps-choice").classList.add("d-none");
            document.querySelector(".peer").classList.remove("d-none");
            res(false);
        };
    })
};

function initiator_setOffer(){
    document.querySelector(".initiator .step-01 pre").innerText = JSON.stringify(conn.localDescription.toJSON(), null, 4);
};

function initiator_answer(){
    return new Promise(res => {
        document.querySelector(".initiator .has-answer").onclick = function(){
            let sdpEnc = document.querySelector(".initiator .answer").value;
            let sdp = null;
            try {
                sdp = JSON.parse(sdpEnc);
            } catch(e){
                res(null);
            }
            res(sdp);
        }
    })
};








function peer_offer(){
    return new Promise(res => {
        document.querySelector(".peer .has-offer").onclick = function(){
            let sdpRaw = document.querySelector(".peer .offer").value;
            let sdp = null;
            try {
                sdp = JSON.parse(sdpRaw);
            } catch(e){ 
                res(null); 
            }
            res(sdp);
        }
    })
};

function peer_showAnswer(){
    document.querySelector(".peer .step-01").classList.add("d-none")
    document.querySelector(".peer .step-02").classList.remove("d-none")
    document.querySelector(".peer .step-02 pre").innerText = JSON.stringify(conn.localDescription.toJSON(), null, 4); // btoa(answer.sdp)
};





















function conn_watchevents(){
    window.conn = conn;
    console.log(`[RTCCONN] Watch events...`);
    for(let eventName of [
            "onaddstream",
            "ontrack", 
            // "onsignalingstatechange", 
            "onnegotiationneeded", 
            // "onicegatheringstatechange", 
            // "oniceconnectionstatechange", 
            "onicecandidateerror", 
            // "onicecandidate", 
            "ondatachannel", 
    ]){
        console.log(`[RTCCONN] Listening for ${eventName}`)
        conn.addEventListener(eventName,  conn_logevent.bind(null, eventName));
        conn.addEventListener(eventName.slice(2),  conn_logevent.bind(null, eventName));
    }
};


function conn_logevent(eventName, ev){
    console.log(`[RTCCONN] ${eventName}`, {ev});
};

function conn_defaults(){
    conn.addEventListener("datachannel", function(ev){
        console.log(`[RTCCONN] Have data channel: `, {ev});
        conn_datachan(ev.channel);        
    });

    conn.addEventListener("connectionstatechange", function(ev){
        console.log(`[RTCCONN] Connection state: `, conn.connectionState);
        if(conn.connectionState == "connected"){
            conn_onconnected();
        }   
    });

    conn.addEventListener("signalingstatechange", function(ev){
        console.log(`[RTCCONN] Signaling state: `, conn.signalingState);
    });

    conn.addEventListener("iceconnectionstatechange", function(ev){
        console.log(`[RTCCONN] ICE conn state: `, conn.iceConnectionState);
    });

    conn.addEventListener("icegatheringstatechange", function(ev){
        console.log(`[RTCCONN] ICE gather state: `, conn.iceGatheringState);
    });

    conn.addEventListener("icecandidate", function(ev){
        let candidate = ev.candidate;
        if(candidate == null)
            return console.log(`[RTCCONN] No new ICE candidate`);

        console.log(`[RTCCONN] New ICE candidate: ${candidate.type} ${candidate.protocol}://${candidate.usernameFragment}@${candidate.address}:${candidate.port}`, candidate);
    });


};

function conn_rendermsg(msg, origin = "me"){
    let box = document.createElement("li");
    box.classList.add("sender-" + origin);
    let d = new Date();
    let hour = `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}`;

    box.innerHTML = `<span class="sender-ts">${hour}</span><div class="sender-text">${msg}</div>`;
    let msgbox = document.querySelector(".msg-box");
    msgbox.appendChild(box);
    msgbox.scrollTop = msgbox.scrollHeight;
};

function conn_sendmsg(msg){
    window.datachan.send(msg);
    conn_rendermsg(msg, "me");
};

function conn_datachan(chan){
    window.datachan = chan;
    chan.onmessage = function(ev){
        console.log(`[CHAN] Got message: `, ev.data);
        conn_rendermsg(ev.data, "him")
    }
};

function conn_onconnected(){
    document.querySelector(".obsidian").classList.remove("d-none");
    document.querySelector(".peer").classList.add("d-none");
    document.querySelector(".initiator").classList.add("d-none");
    document.querySelector(".msg-sender").addEventListener("keydown", function(ev){
        if(ev.keyCode == 13){
            ev.preventDefault();
            conn_sendmsg(document.querySelector(".msg-sender").value);
            document.querySelector(".msg-sender").value = "";
        }
    });
    document.querySelector(".msg-sender").addEventListener("keyup", function(ev){
        if(ev.keyCode == 13){
            ev.preventDefault();
        }
    });
};


function sleep(ms){
    return new Promise(res => setTimeout(res, ms));
};