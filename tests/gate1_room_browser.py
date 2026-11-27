from pathlib import Path
import argparse
import json
import tempfile
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5585/game/')
parser.add_argument('--artifacts', default=str(Path(tempfile.gettempdir()) / 'g999-gate1-test'))
args = parser.parse_args()
out = Path(args.artifacts)
out.mkdir(parents=True, exist_ok=True)
ROOT = Path(__file__).resolve().parents[1]


def finish(page):
    for _ in range(50):
        nxt = page.locator('#nd-next')
        if not nxt.is_visible() or '点击继续' not in nxt.inner_text():
            return
        page.locator('#node-dialogue').click()
        page.wait_for_timeout(20)
    raise AssertionError('Dialogue did not finish')


def frame(page, gate=1):
    return page.locator(f'#gate{gate}-model').element_handle().content_frame()


def wait_view(page, view):
    f = frame(page)
    f.wait_for_function('(view) => window.__SCENE_DIAGNOSTICS__?.ready && window.__SCENE_DIAGNOSTICS__.active && window.__SCENE_DIAGNOSTICS__.settled && window.__SCENE_DIAGNOSTICS__.view === view', arg=view, timeout=60000)
    page.wait_for_timeout(180)
    return f.evaluate('JSON.parse(JSON.stringify(window.__SCENE_DIAGNOSTICS__))')


def marker(page, name):
    return page.locator(f'[data-gate1-anchor="{name}"]')


def verify_markers(page):
    data = page.locator('[data-gate1-anchor]').evaluate_all('els=>els.map(el=>{const r=el.getBoundingClientRect();const s=document.getElementById("node-stage").getBoundingClientRect();return {id:el.dataset.gate1Anchor,ready:el.dataset.positioned,inside:r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom,x:r.x,y:r.y,w:r.width,h:r.height};})')
    assert data and all(m['ready'] == 'true' and m['inside'] for m in data), data
    obstacles = page.locator('.np-view-nav').evaluate_all('els=>els.map(el=>{const r=el.getBoundingClientRect();return {id:el.textContent,x:r.x,y:r.y,w:r.width,h:r.height};})')
    for i, a in enumerate(data):
        for b in data[i + 1:] + obstacles:
            overlap = min(a['x'] + a['w'], b['x'] + b['w']) > max(a['x'], b['x']) and min(a['y'] + a['h'], b['y'] + b['h']) > max(a['y'], b['y'])
            assert not overlap, f'Marker overlap: {a} / {b}'


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    offline = browser.new_context(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
    offline.set_offline(True)
    showcase = offline.new_page()
    requests, errors = [], []
    showcase.on('request', lambda r: requests.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    showcase.on('pageerror', lambda e: errors.append(str(e)))
    showcase.goto((ROOT / 'game/models/gate1-diorama/index.html').as_uri())
    showcase.wait_for_function('window.__SCENE_DIAGNOSTICS__?.ready', timeout=60000)
    showcase.wait_for_timeout(700)
    showcase.screenshot(path=str(out / 'model-overview.png'))
    initial = showcase.evaluate('JSON.parse(JSON.stringify(window.__SCENE_DIAGNOSTICS__))')
    assert initial['mugs'] == 7 and initial['stainIndices'] == [2, 4, 7]
    assert initial['halfCups'] == initial['waterDrops'] == 7
    assert initial['cupFillFractions'] == [0.5] * 7
    assert initial['coffeeDisplay'] == '50%' and initial['coffeeFillFraction'] == 0.5
    assert initial['clockHourDirection'] == 'upper-left' and initial['clockMinuteDirection'] == 'up'
    assert initial['realReflection']
    showcase.mouse.move(710, 550)
    showcase.mouse.down()
    showcase.mouse.move(930, 590, steps=12)
    showcase.mouse.up()
    showcase.wait_for_timeout(500)
    assert showcase.evaluate('window.__SCENE_DIAGNOSTICS__.camera.position') != initial['camera']['position']
    showcase.mouse.wheel(0, -450)
    showcase.wait_for_timeout(500)
    assert showcase.evaluate('window.__SCENE_DIAGNOSTICS__.camera.zoom') > 1
    showcase.screenshot(path=str(out / 'model-detail.png'))
    showcase.mouse.move(700, 600)
    showcase.mouse.down(button='right')
    showcase.mouse.move(770, 620, steps=6)
    showcase.mouse.up(button='right')
    showcase.wait_for_timeout(300)
    assert showcase.evaluate('window.__SCENE_DIAGNOSTICS__.camera.target') != initial['camera']['target']
    assert not requests and not errors, (requests, errors)
    offline.close()

    context = browser.new_context(viewport={'width': 1440, 'height': 1050})
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(args.url, wait_until='domcontentloaded')
    page.wait_for_function('!!window.Flow')
    assert page.locator('#gate1-model').count() == 0
    page.evaluate('Flow.enterNode("e_tea")')
    page.wait_for_selector('#node-stage[data-gate1="ready"]', timeout=60000)
    finish(page)
    ids = {
        'ground': ['npc_hanasaki_ground', 'mech4', 'npc_sanae_ground', 'npc_mio_ground'],
        'air': ['mech2', 'npc_arami_air', 'mech3', 'npc_lan_air'],
        'ceiling': ['mech1']
    }
    poses = {}

    def inspect(view, prefix='', click=True):
        poses[view] = wait_view(page, view)
        page.screenshot(path=str(out / f'{prefix}{view}.png'))
        verify_markers(page)
        actual = set(page.locator('[data-gate1-anchor]').evaluate_all('els=>els.map(e=>e.dataset.gate1Anchor)'))
        assert actual == set(ids[view] + (['door'] if view == 'ground' else []))
        if click:
            for name in ids[view]:
                marker(page, name).click()
                assert page.locator('#node-hotspots').evaluate('el=>el.inert')
                finish(page)
                assert not page.locator('#node-hotspots').evaluate('el=>el.inert')

    inspect('ground')
    assert page.locator('.np-view-nav').count() == 1
    page.locator('.np-view-nav-up').click()
    inspect('air')
    assert page.locator('.np-view-nav').count() == 2
    page.locator('.np-view-nav-up').click()
    inspect('ceiling')
    assert page.locator('.np-view-nav').count() == 1
    assert len({tuple(v['camera']['position']) for v in poses.values()}) == 3
    page.locator('.np-view-nav-down').click()
    page.locator('.np-view-nav-down').click()
    page.locator('.np-view-nav-up').click()
    wait_view(page, 'air')
    verify_markers(page)
    page.locator('#btn-node-flow').click()
    page.wait_for_timeout(450)
    f = frame(page)
    paused = f.evaluate('window.__SCENE_DIAGNOSTICS__.frames')
    page.wait_for_timeout(300)
    assert f.evaluate('window.__SCENE_DIAGNOSTICS__.frames') == paused
    page.evaluate('Flow.enterNode("e_tea")')
    finish(page)
    wait_view(page, 'ground')
    assert page.locator('#gate1-model').count() == 1
    for width in [430, 360]:
        page.set_viewport_size({'width': width, 'height': 860})
        page.wait_for_timeout(350)
        inspect('ground', f'mobile{width}-', False)
        page.locator('.np-view-nav-up').click()
        inspect('air', f'mobile{width}-', False)
        page.locator('.np-view-nav-up').click()
        inspect('ceiling', f'mobile{width}-', False)
        page.locator('.np-view-nav-down').click()
        wait_view(page, 'air')
        page.locator('.np-view-nav-down').click()
        wait_view(page, 'ground')
    marker(page, 'door').click()
    finish(page)
    page.wait_for_selector('#node-lock', state='visible')
    page.screenshot(path=str(out / 'mobile-lock.png'))
    for digit in '0000':
        page.locator('#kp-grid').get_by_role('button', name=digit, exact=True).click()
    page.locator('.kp-ok').click()
    assert page.locator('#kp-msg').inner_text()
    page.locator('#kp-close').click()
    marker(page, 'door').click()
    for digit in '3527':
        page.locator('#kp-grid').get_by_role('button', name=digit, exact=True).click()
    page.locator('.kp-ok').click()
    finish(page)
    assert '继续前进' in page.locator('#nd-next').inner_text()
    page.locator('#node-dialogue').click()
    page.wait_for_timeout(300)
    assert page.locator('#node-stage').get_attribute('data-gate1') is None
    assert not f.evaluate('window.__SCENE_DIAGNOSTICS__.active')
    for node, gate in [('e_server', 2), ('e_dark', 3)]:
        page.evaluate('(node)=>Flow.enterNode(node)', node)
        finish(page)
        frame(page, gate).wait_for_function('window.__SCENE_DIAGNOSTICS__?.ready')
        assert page.locator('#node-stage').get_attribute(f'data-gate{gate}') == 'ready'
        assert not f.evaluate('window.__SCENE_DIAGNOSTICS__.active')
    page.evaluate('Flow.enterNode("e_tea")')
    finish(page)
    wait_view(page, 'ground')
    for gate in [2, 3]:
        assert not frame(page, gate).evaluate('window.__SCENE_DIAGNOSTICS__.active')
    page.emulate_media(reduced_motion='reduce')
    page.locator('.np-view-nav-up').click()
    wait_view(page, 'air')
    assert not errors, errors

    fallback = context.new_page()
    fallback.add_init_script("if(location.pathname.includes('/gate1-diorama/')) HTMLCanvasElement.prototype.getContext = () => null;")
    fallback.goto(args.url, wait_until='domcontentloaded')
    fallback.wait_for_function('!!window.Flow')
    fallback.evaluate('Flow.enterNode("e_tea")')
    fallback.wait_for_selector('#node-stage[data-gate1="fallback"]', timeout=45000)
    finish(fallback)
    marker(fallback, 'mech4').click()
    finish(fallback)
    fallback.locator('.np-view-nav-up').click()
    marker(fallback, 'mech3').click()
    finish(fallback)
    assert not fallback.locator('#node-hotspots').evaluate('el=>el.inert')
    fallback.screenshot(path=str(out / 'fallback.png'))
    report = {'passed': True, 'offline': initial, 'views': poses, 'errors': errors,
              'checks': ['offline_html', 'no_external_requests', 'rotate_zoom_pan', '7_cups_3_stains', '7_half_glasses_7_drops',
                         '50_percent_coffee', 'mirrored_clock', 'real_reflection', 'three_cameras', 'all_10_targets',
                         'rapid_switch', 'dialogue_resume', 'mobile_430_and_360', 'passwords', 'leave_pause', 'reentry',
                         'gate2_gate3_coexistence', 'reduced_motion', 'webgl_fallback']}
    (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed': True, 'checks': report['checks'], 'artifacts': str(out)}, ensure_ascii=True))
    browser.close()
