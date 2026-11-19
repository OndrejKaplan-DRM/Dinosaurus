import subprocess,json,re,pathlib,concurrent.futures,sys,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(sys.argv[1])
mapping={'menu_a':'Night Menu.mp3','menu_b':'Night Menu (1).mp3','grove_a':'Lazy Prehistoric Grove.mp3','grove_b':'Lazy Prehistoric Grove (1).mp3','run_a':'Agile Exploration.mp3','run_b':'Agile Exploration (1).mp3','run_c':'Agile Exploration (2).mp3','run_d':'Agile Exploration (3).mp3'}
def measure(p):
 r=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','loudnorm=I=-20:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 return json.loads(re.findall(r'\{[^{}]+\}',r.stderr)[-1])
def convert(item):
 key,name=item;p=source/name;m=measure(p);dest=root/'public/music'/f'{key}.ogg'
 filt='loudnorm=I=-20:TP=-2:LRA=11:linear=true:'+':'.join(f'{k}={m[v]}' for k,v in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-map_metadata','-1','-af',filt,'-ar','44100','-ac','2','-c:a','libvorbis','-q:a','4',str(dest)],check=True)
 out=measure(dest);duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(dest)]))
 return {'id':key,'source':name,'duration':duration,'source_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'before':m,'after':out,'bytes':dest.stat().st_size}
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as ex:rows=list(ex.map(convert,mapping.items()))
(root.parent/'SUNO_AUDIO_ANALYZA.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
for r in rows:print(r['id'],round(r['duration'],1),r['after']['input_i'],r['after']['input_tp'])
