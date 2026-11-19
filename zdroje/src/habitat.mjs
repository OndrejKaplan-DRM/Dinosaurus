// Stylised late-Cretaceous plant silhouettes, shared with the compatibility view.
export const HABITAT=['broadleaf','conifer','palm','ginkgo','cycad','horsetail','moss','pond','turtle','croc'];
export function habitatSprite(kind){const c=document.createElement('canvas');c.width=400;c.height=500;const g=c.getContext('2d');const ellipse=(x,y,rx,ry,color)=>{g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();};
 if(['pond','moss','turtle','croc'].includes(kind)){
  if(kind==='pond'){ellipse(200,390,180,90,'#344f3c');ellipse(200,380,162,65,'#487d76');for(let i=0;i<8;i++){g.strokeStyle='#a9d9c066';g.beginPath();g.ellipse(200,380,30+i*17,10+i*6,0,0,Math.PI*2);g.stroke();}}
  if(kind==='moss')for(let i=0;i<35;i++)ellipse(45+(i*97)%315,380+(i*43)%90,28,16,['#3c652c','#56813b','#6f9144'][i%3]);
  if(kind==='turtle'){for(const x of[120,270])for(const y of[330,420])ellipse(x,y,30,12,'#596b35');ellipse(200,370,100,65,'#566239');ellipse(310,366,35,23,'#77955b');for(let i=0;i<5;i++){g.strokeStyle='#a9a16a';g.beginPath();g.ellipse(200,370,20+i*16,15+i*9,0,0,Math.PI*2);g.stroke();}}
  if(kind==='croc'){ellipse(200,390,120,34,'#52693b');ellipse(325,385,63,15,'#6a7945');g.fillStyle='#536b3c';g.beginPath();g.moveTo(100,370);g.lineTo(5,425);g.lineTo(115,413);g.fill();for(let i=0;i<12;i++)ellipse(130+i*15,370,5,8,'#35492a');ellipse(300,372,5,4,'#e2c476');}return c;
 }
 g.strokeStyle='#635c3b';g.lineCap='round';g.lineWidth=kind==='horsetail'?7:18;g.beginPath();g.moveTo(200,490);g.quadraticCurveTo(176,330,205,110);g.stroke();
 if(kind==='conifer'){for(let j=8;j>=0;j--){const y=35+j*40,w=20+j*16;g.strokeStyle='#325d42';g.lineWidth=7;g.beginPath();g.moveTo(200-w,y+55);g.quadraticCurveTo(200,y,200+w,y+55);g.stroke();for(let k=0;k<11;k++){const x=200+(k-5)*w/5,dy=Math.abs(k-5)*5;ellipse(x,y+dy,13+j*2,20+j, ['#24553e','#326948','#468256'][(k+j)%3]);}}}
 else if(kind==='palm'||kind==='cycad'){for(let i=0;i<11;i++){const a=i/11*Math.PI*2,x=200+Math.cos(a)*165,y=190+Math.sin(a)*105;g.strokeStyle='#56873e';g.lineWidth=5;g.beginPath();g.moveTo(200,240);g.quadraticCurveTo(x,110,x,y+90);g.stroke();for(let j=1;j<9;j++){const t=j/9;g.save();g.translate(200+(x-200)*t,240+(y-150)*t);g.rotate(a);g.fillStyle=j%2?'#4c8739':'#79a24a';g.beginPath();g.ellipse(0,0,35*(1-t)+8,kind==='palm'?17:7,.7,0,Math.PI*2);g.fill();g.restore();}}}
 else if(kind==='horsetail'){for(let j=0;j<11;j++){const y=140+j*29;g.strokeStyle='#7caa59';g.lineWidth=4;g.beginPath();g.moveTo(180,y);g.lineTo(216,y);g.stroke();for(let i=0;i<6;i++){g.lineWidth=3;g.beginPath();g.moveTo(200,y);g.lineTo(200+Math.cos(i*Math.PI/3)*75,y-35);g.stroke();}}}
 else {for(let i=0;i<40;i++){const x=65+(i*83)%275,y=70+(i*61)%250;ellipse(x,y,45+(i%3)*10,kind==='ginkgo'?30:48,['#2e633d','#4b8748','#6c9b4d','#80ac5b'][i%4]);if(kind==='ginkgo'){g.strokeStyle='#bbbf6c55';g.lineWidth=1.5;g.beginPath();g.moveTo(x,y+25);g.lineTo(x-25,y-15);g.moveTo(x,y+25);g.lineTo(x+25,y-15);g.stroke();}}}return c;
}
