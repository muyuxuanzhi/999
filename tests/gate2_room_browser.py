from pathlib import Path
import argparse
import json
import tempfile
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5585/game/')
parser.add_argument('--artifacts', default=str(Path(tempfile.gettempdir()) / 'g999-gate2-test'))
args = parser.parse_args()
artifacts = Path(args.artifacts)
artifacts.mkdir(parents=True, exist_ok=True)


def finish_dialogue(page):
    for _ in range(45):
        nxt = page.locator('#nd-next')
        if not nxt.is_visible() or '点击继续' not in nxt.inner_text():
            return
        page.locator('#node-dialogue').click()
        page.wait_for_timeout(25)
    raise AssertionError('Dialogue did not finish')


def scene_frame(page):
    return page.locator('#gate2-model').element_handle().content_frame()


def wait_view(page, name):
    frame = scene_frame(page)
    frame.wait_for_function('(name) => window.__SCENE_DIAGNOSTICS__?.view === name && window.__SCENE_DIAGNOSTICS__.settled && window.__SCENE_DIAGNOSTICS__.active', arg=name)
    page.wait_for_timeout(180)
    return frame.evaluate('JSON.parse(JSON.stringify(window.__SCENE_DIAGNOSTICS__))')


def marker(page, name):
    return page.locator(f'[data-gate2-anchor="{name}"]')


def check_markers(page):
    data = page.locator('[data-gate2-anchor]').evaluate_all('els => els.map(el => { const r=el.getBoundingClientRect(); const s=document.getElementById("node-stage").getBoundingClientRect(); return { id:el.dataset.gate2Anchor, positioned:el.dataset.positioned, visible:getComputedStyle(el).visibility, inside:r.left>=s.left && r.right<=s.right && r.top>=s.top && r.bottom<=s.bottom, x:r.x,y:r.y,w:r.width,h:r.height }; })')
    assert data and all(m['positioned'] == 'true' and m['inside'] and m['visible'] == 'visible' for m in data), data
    for i, a in enumerate(data):
        for b in data[i + 1:]:
            overlap = min(a['x'] + a['w'], b['x'] + b['w']) > max(a['x'], b['x']) and min(a['y'] + a['h'], b['y'] + b['h']) > max(a['y'], b['y'])
            assert not overlap, f'Marker overlap: {a} / {b}'
    return data


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1050}, reduced_motion='no-preference')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(args.url, wait_until='domcontentloaded')
    page.wait_for_function('!!window.Flow')
    assert page.locator('#gate2-model').count() == 0
    page.evaluate('Flow.enterNode("e_server")')
    page.wait_for_selector('#node-stage[data-gate2="ready"]', timeout=60000)
    finish_dialogue(page)
    poses = {'gate': wait_view(page, 'gate')}
    assert poses['gate']['clueLights'] == 7
    assert poses['gate']['constantlyLitGreenLights'] == 4
    assert poses['gate']['stationaryBlades'] == 2
    check_markers(page)
    page.screenshot(path=str(artifacts / 'gate.png'))
    marker(page, 'terminal').click()
    assert page.locator('#node-hotspots').evaluate('el => el.inert')
    finish_dialogue(page)
    assert not page.locator('#node-hotspots').evaluate('el => el.inert')
    marker(page, 'npc_lu_gate').click()
    finish_dialogue(page)
    routes = [('west', '.np-view-nav-left', ['mech1', 'npc_ling_west', 'npc_qing_west']),
              ('north', '.np-view-nav-up', ['mech2', 'mech3', 'npc_shiori_north', 'npc_ling_north']),
              ('east', '.np-view-nav-right', ['mech4'])]
    for name, nav, ids in routes:
        page.locator(nav).click()
        poses[name] = wait_view(page, name)
        check_markers(page)
        page.screenshot(path=str(artifacts / (name + '.png')))
        for anchor in ids:
            marker(page, anchor).click()
            finish_dialogue(page)
            assert page.locator('#node-hotspots').evaluate('el => !el.inert && el.style.pointerEvents === "auto"')
        page.locator('.np-view-nav').click()
        wait_view(page, 'gate')
    assert len({tuple(pose['camera']['position']) for pose in poses.values()}) == 4
    page.locator('.np-view-nav-left').click()
    page.locator('.np-view-nav-right').click()
    page.locator('.np-view-nav-up').click()
    wait_view(page, 'north')
    check_markers(page)
    page.locator('#btn-node-flow').click()
    page.wait_for_timeout(500)
    frame = scene_frame(page)
    inactive = frame.evaluate('window.__SCENE_DIAGNOSTICS__.frames')
    page.wait_for_timeout(250)
    assert frame.evaluate('window.__SCENE_DIAGNOSTICS__.frames') == inactive
    page.evaluate('Flow.enterNode("e_server")')
    finish_dialogue(page)
    wait_view(page, 'gate')
    assert page.locator('#gate2-model').count() == 1
    page.set_viewport_size({'width': 430, 'height': 860})
    page.wait_for_timeout(300)
    check_markers(page)
    page.screenshot(path=str(artifacts / 'mobile-gate.png'))
    for name, nav, _ in routes:
        page.locator(nav).click()
        wait_view(page, name)
        check_markers(page)
        page.screenshot(path=str(artifacts / ('mobile-' + name + '.png')))
        page.locator('.np-view-nav').click()
        wait_view(page, 'gate')
    page.set_viewport_size({'width': 1440, 'height': 1050})
    page.wait_for_timeout(300)
    marker(page, 'door').click()
    finish_dialogue(page)
    page.wait_for_selector('#node-lock', state='visible')
    assert page.locator('#node-hotspots').evaluate('el => el.inert')
    for digit in '1111':
        page.locator('#kp-grid').get_by_role('button', name=digit, exact=True).click()
    page.locator('.kp-ok').click()
    assert page.locator('#kp-msg').inner_text()
    page.locator('#kp-close').click()
    marker(page, 'door').click()
    for digit in '4023':
        page.locator('#kp-grid').get_by_role('button', name=digit, exact=True).click()
    page.locator('.kp-ok').click()
    finish_dialogue(page)
    assert '继续前进' in page.locator('#nd-next').inner_text()
    page.locator('#node-dialogue').click()
    page.wait_for_timeout(300)
    assert page.locator('#node-stage').get_attribute('data-gate2') is None
    assert frame.evaluate('window.__SCENE_DIAGNOSTICS__.active') is False
    page.evaluate('Flow.enterNode("e_tea")')
    finish_dialogue(page)
    assert page.locator('#node-stage').get_attribute('data-gate2') is None
    assert page.locator('.np-hotspot').count() > 0
    page.locator('.np-hotspot').first.click()
    finish_dialogue(page)
    assert not page.locator('#node-hotspots').evaluate('el => el.inert')
    assert not errors, errors

    fallback = context.new_page()
    fallback.add_init_script("if(location.pathname.includes('/gate2-diorama/')) HTMLCanvasElement.prototype.getContext = () => null;")
    fallback.goto(args.url, wait_until='domcontentloaded')
    fallback.wait_for_function('!!window.Flow')
    fallback.evaluate('Flow.enterNode("e_server")')
    fallback.wait_for_selector('#node-stage[data-gate2="fallback"]', timeout=45000)
    finish_dialogue(fallback)
    marker(fallback, 'terminal').click()
    finish_dialogue(fallback)
    fallback.locator('.np-view-nav-left').click()
    marker(fallback, 'mech1').click()
    finish_dialogue(fallback)
    assert not fallback.locator('#node-hotspots').evaluate('el => el.inert')
    fallback.screenshot(path=str(artifacts / 'fallback.png'))
    report = {'passed': True, 'poses': poses, 'errors': errors,
              'checks': ['lazy_load', 'all_four_views', 'world_projected_markers', 'all_investigations',
                         'dialogue_resume', 'rapid_switch', 'leave_pause', 'reentry', 'mobile',
                         'wrong_password', 'correct_password', 'next_node', 'tea_regression', 'webgl_fallback']}
    (artifacts / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed': True, 'checks': report['checks'], 'artifacts': str(artifacts)}, ensure_ascii=True))
    browser.close()
