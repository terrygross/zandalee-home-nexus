# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['ollama_proxy.py'],
    pathex=[],
    binaries=[],
    datas=[('C:\\Users\\teren\\Documents\\Zandalee\\zandalee-home-nexus\\dist', 'ui_dist')],
    hiddenimports=['python_multipart'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='ZandaleeDesktop',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
