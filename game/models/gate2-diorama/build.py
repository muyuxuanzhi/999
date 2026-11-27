from pathlib import Path
import io
import posixpath
import re
import subprocess
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parent
VENDOR = ROOT / 'vendor' / 'three'
VERSION = '0.170.0'
ESBUILD = '0.24.2'


def fetch(url):
    last = None
    for _ in range(3):
        try:
            with urllib.request.urlopen(url, timeout=90) as response:
                return response.read()
        except Exception as exc:
            last = exc
    raise last


def dependency(rel):
    path = VENDOR / rel
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(fetch(f'https://cdn.jsdelivr.net/npm/three@{VERSION}/{rel}'))
    if path.suffix != '.js':
        return
    text = path.read_text(encoding='utf-8')
    for imp in re.findall(r'(?:from\s+|import\s*)[\"\']([^\"\']+)[\"\']', text):
        if imp.startswith('.'):
            dependency(posixpath.normpath(posixpath.join(posixpath.dirname(rel), imp)))


def build():
    dependency('build/three.module.js')
    dependency('LICENSE')
    for file in ['controls/OrbitControls.js', 'geometries/RoundedBoxGeometry.js',
                 'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js',
                 'postprocessing/UnrealBloomPass.js', 'postprocessing/OutputPass.js',
                 'objects/Reflector.js']:
        dependency('examples/jsm/' + file)
    tool = ROOT / 'tools' / 'esbuild.exe'
    if not tool.exists():
        archive = fetch(f'https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-{ESBUILD}.tgz')
        with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
            member = tar.getmember('package/esbuild.exe')
            tool.parent.mkdir(parents=True, exist_ok=True)
            tool.write_bytes(tar.extractfile(member).read())
    output = ROOT / 'scene.bundle.js'
    subprocess.run([str(tool), str(ROOT / 'scene.js'), '--bundle', '--format=iife', '--minify',
                    '--target=chrome110', '--legal-comments=inline', f'--outfile={output}',
                    f'--alias:three={VENDOR / "build/three.module.js"}'], check=True)
    bundle = output.read_text(encoding='utf-8').replace('</script', '<\\/script')
    template = (ROOT / 'index.template.html').read_text(encoding='utf-8')
    target = ROOT / 'index.html'
    html = template.replace('/* SCENE_BUNDLE */', bundle)
    html = re.sub(r'[ \t]+(?=\r?$)', '', html, flags=re.MULTILINE)
    target.write_text(html, encoding='utf-8')
    print('BUILD_OK', target.name, target.stat().st_size)


if __name__ == '__main__':
    build()
