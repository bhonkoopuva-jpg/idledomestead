import sys
order=['util','scan','trees','robot','assets','audio','world','game','econ','ui','main']
tpl=open('src/tpl.html').read()
three=open('/tmp/claude-0/t3/tj/build/three.min.js').read()
js='\n'.join(open('src/%s.js'%n).read() for n in order)
assert '</script' not in js
tpl=tpl.replace('<div id="joy">','<div id="load" style="position:fixed;inset:0;background:#c4552f;display:grid;place-items:center;color:#fff;font:700 28px Fredoka,system-ui,sans-serif;z-index:99;letter-spacing:1px">Landing on Mars…</div><div id="joy">')
out=tpl.replace('<!--THREE-->','<script>'+three+'</script>').replace('<!--JS-->',js)
open('dist.html','w').write(out)
print(len(out))
