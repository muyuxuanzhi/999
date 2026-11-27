from pathlib import Path
import argparse
import json
import tempfile
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5585/game/')
parser.add_argument('--artifacts', default=str(Path(tempfile.gettempdir()) / 'g999-gate3-test'))
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
    raise AssertionError('Dialogue failed to finish')


def frame(page, gate=3):
    return page.locator(f'#gate{gate}-model').element_handle().content_frame()


def wait_view(page, view):
    f = frame(page)
    f.wait_for_function('(view) => window.__SCENE_DIAGNOSTICS__?.ready && window.__SCENE_DIAGNOSTICS__.active && window.__SCENE_DIAGNOSTICS__.view === view && window.__SCENE_DIAGNOSTICS__.settled', arg=view, timeout=60000)
    page.wait_for_timeout(180)
    return f.evaluate('JSON.parse(JSON.stringify(window.__SCENE_DIAGNOSTICS__))')


def marker(page, name):
    return page.locator(f'[data-gate3-anchor="{name}"]')


def verify_markers(page):
    data = page.locator('[data-gate3-anchor]').evaluate_all('els => els.map(el => { const r=el.getBoundingClientRect();const s=document.getElementById("node-stage").getBoundingClientRect();return {id:el.dataset.gate3Anchor,ready:el.dataset.positioned,inside:r.left>=s.left && r.right<=s.right && r.top>=s.top && r.bottom<=s.bottom,x:r.x,y:r.y,w:r.width,h:r.height}; })')
    assert data and all(m['ready'] == 'true' and m['inside'] for m in data), data
    obstacles = page.locator('.np-view-nav').evaluate_all('els=>els.map(el=>{const r=el.getBoundingClientRect();return {id:el.textContent,x:r.x,y:r.y,w:r.width,h:r.height};})')
    for i, a in enumerate(data):
        for b in data[i + 1:] + obstacles:
            overlaps = min(a['x'] + a['w'], b['x'] + b['w']) > max(a['x'], b['x']) and min(a['y'] + a['h'], b['y'] + b['h']) > max(a['y'], b['y'])
            assert not overlaps, f'Marker overlap: {a} / {b}'
    return data


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    offline = browser.new_context(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
    offline.set_offline(True)
    showcase = offline.new_page()
    requests, errors = [], []
    showcase.on('request', lambda r: requests.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    showcase.on('pageerror', lambda e: errors.append(str(e)))
    showcase.goto((ROOT / 'game/models/gate3-diorama/index.html').as_uri())
    showcase.wait_for_function('window.__SCENE_DIAGNOSTICS__?.ready', timeout=60000)
    showcase.wait_for_timeout(800)
    showcase.screenshot(path=str(out / 'model-overview.png'))
    initial = showcase.evaluate('JSON.parse(JSON.stringify(window.__SCENE_DIAGNOSTICS__))')
    assert (initial['tactileDots'], initial['echoObstacles'], initial['metalHandles'], initial['deadLamps'], initial['litClueLamps']) == (3, 5, 1, 8, 0)
    showcase.mouse.move(700, 550)
    showcase.mouse.down()
    showcase.mouse.move(940, 580, steps=10)
    showcase.mouse.up()
    showcase.wait_for_timeout(500)
    assert showcase.evaluate('window.__SCENE_DIAGNOSTICS__.camera.position') != initial['camera']['position']
    showcase.mouse.wheel(0, -450)
    showcase.wait_for_timeout(500)
    assert showcase.evaluate('window.__SCENE_DIAGNOSTICS__.camera.zoom') > 1
    showcase.screenshot(path=str(out / 'model-detail.png'))
    showcase.mouse.move(750, 600)
    showcase.mouse.down(button='right')
    showcase.mouse.move(820, 620, steps=7)
    showcase.mouse.up(button='right')
    showcase.wait_for_timeout(300)
    assert showcase.evaluate('window.__SCENE_DIAGNOSTICS__.camera.target') != initial['camera']['target']
    assert not requests and not errors, (requests, errors)
    offline.close()

    ctx = browser.new_context(viewport={'width': 1440, 'height': 1050})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(args.url, wait_until='domcontentloaded')
    page.wait_for_function('!!window.Flow')
    assert page.locator('#gate3-model').count() == 0
    page.evaluate('Flow.enterNode("e_dark")')
    page.wait_for_selector('#node-stage[data-gate3="ready"]', timeout=60000)
    finish(page)
    poses = {}
    ids = {
        'hub': ['hub_sense'],
        'north': ['mech1', 'mech2', 'npc_anzumi_n', 'npc_tsuzuri_n'],
        'west': ['npc_kei_w', 'npc_kamae_w'],
        'east': ['mech3', 'npc_hikari_e'],
        'south': ['mech4', 'npc_anzumi_s', 'npc_kei_s']
    }

    def inspect(view, prefix='', click=True):
        poses[view] = wait_view(page, view)
        page.screenshot(path=str(out / f'{prefix}{view}.png'))
        verify_markers(page)
        expected = set(ids[view] + (['door'] if view == 'south' else []))
        actual = set(page.locator('[data-gate3-anchor]').evaluate_all('els=>els.map(e=>e.dataset.gate3Anchor)'))
        assert expected == actual
        if click:
            for name in ids[view]:
                marker(page, name).click()
                assert page.locator('#node-hotspots').evaluate('el=>el.inert')
                finish(page)
                assert not page.locator('#node-hotspots').evaluate('el=>el.inert')

    inspect('hub')
    assert page.locator('.np-view-nav').count() == 3
    for view, selector in [('north', '.np-view-nav-up'), ('hub', '.np-view-nav-down'),
                           ('west', '.np-view-nav-left'), ('south', '.np-view-nav-down'),
                           ('east', '.np-view-nav-right'), ('hub', '.np-view-nav-left')]:
        page.locator(selector).click()
        inspect(view)
    assert len({tuple(pose['camera']['position']) for pose in poses.values()}) == 5
    page.locator('.np-view-nav-up').click()
    page.locator('.np-view-nav-down').click()
    page.locator('.np-view-nav-right').click()
    wait_view(page, 'east')
    verify_markers(page)
    page.locator('#btn-node-flow').click()
    page.wait_for_timeout(400)
    f = frame(page)
    count = f.evaluate('window.__SCENE_DIAGNOSTICS__.frames')
    page.wait_for_timeout(300)
    assert f.evaluate('window.__SCENE_DIAGNOSTICS__.frames') == count
    page.evaluate('Flow.enterNode("e_dark")')
    finish(page)
    wait_view(page, 'hub')
    assert page.locator('#gate3-model').count() == 1
    page.set_viewport_size({'width': 430, 'height': 860})
    page.wait_for_timeout(350)
    inspect('hub', 'mobile-', False)
    for view, selector in [('north', '.np-view-nav-up'), ('hub', '.np-view-nav-down'),
                           ('west', '.np-view-nav-left'), ('south', '.np-view-nav-down'), ('east', '.np-view-nav-right')]:
        page.locator(selector).click()
        inspect(view, 'mobile-', False)
    page.locator('.np-view-nav-down').click()
    wait_view(page, 'south')
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
    for digit in '3518':
        page.locator('#kp-grid').get_by_role('button', name=digit, exact=True).click()
    page.locator('.kp-ok').click()
    finish(page)
    assert '继续前进' in page.locator('#nd-next').inner_text()
    page.locator('#node-dialogue').click()
    page.wait_for_timeout(300)
    assert page.locator('#node-stage').get_attribute('data-gate3') is None
    assert not f.evaluate('window.__SCENE_DIAGNOSTICS__.active')
    page.evaluate('Flow.enterNode("e_server")')
    finish(page)
    frame(page, 2).wait_for_function('window.__SCENE_DIAGNOSTICS__?.ready')
    assert page.locator('#node-stage').get_attribute('data-gate2') == 'ready'
    assert page.locator('#node-stage').get_attribute('data-gate3') is None
    assert not f.evaluate('window.__SCENE_DIAGNOSTICS__.active')
    page.evaluate('Flow.enterNode("e_dark")')
    finish(page)
    wait_view(page, 'hub')
    assert not frame(page, 2).evaluate('window.__SCENE_DIAGNOSTICS__.active')
    page.emulate_media(reduced_motion='reduce')
    page.locator('.np-view-nav-right').click()
    wait_view(page, 'east')
    assert not errors, errors

    fallback = ctx.new_page()
    fallback.add_init_script("if(location.pathname.includes('/gate3-diorama/')) HTMLCanvasElement.prototype.getContext = () => null;")
    fallback.goto(args.url, wait_until='domcontentloaded')
    fallback.wait_for_function('!!window.Flow')
    fallback.evaluate('Flow.enterNode("e_dark")')
    fallback.wait_for_selector('#node-stage[data-gate3="fallback"]', timeout=45000)
    finish(fallback)
    marker(fallback, 'hub_sense').click()
    finish(fallback)
    fallback.locator('.np-view-nav-up').click()
    marker(fallback, 'mech1').click()
    finish(fallback)
    assert not fallback.locator('#node-hotspots').evaluate('el=>el.inert')
    fallback.screenshot(path=str(out / 'fallback.png'))
    report = {'passed': True, 'offline': initial, 'views': poses, 'errors': errors,
              'checks': ['offline_html', 'no_external_requests', 'orbit_zoom_pan', '3_5_1_8_counts',
                         'five_cameras', 'all_13_targets', 'unchanged_topology', 'rapid_switch', 'dialogue_resume',
                         'mobile', 'wrong_and_correct_password', 'leave_pause', 'reentry', 'gate2_coexistence', 'reduced_motion', 'webgl_fallback']}
    (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed': True, 'checks': report['checks'], 'artifacts': str(out)}, ensure_ascii=True))
    browser.close()
