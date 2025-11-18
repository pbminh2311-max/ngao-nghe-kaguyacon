$path = 'e:\!Tin hoc\VSC\du an 2\index.html'
if (-not (Test-Path $path)) {
    Write-Error "File not found: $path"
    exit 1
}

$content = Get-Content $path -Raw
$pattern = '(?s)<div id="devInstructionsCard" class="card hidden" style="position: absolute; top: 60px; right: 10px; width: 280px; max-height: 450px; overflow-y: auto; z-index: 100; padding: 15px; background: rgba\(20, 30, 45, 0.9\); border: 1px solid #4a5568;">.*?<button class="settings-close-x" style="top: 12px; right: 12px;">×</button>\r?\n</div>'
$replacement = @'
<div id="devInstructionsCard" class="card hidden" style="position: absolute; top: 60px; right: 10px; width: 320px; max-height: 520px; overflow-y: auto; z-index: 100; padding: 18px; background: rgba(20, 30, 45, 0.92); border: 1px solid #4a5568;">
    <button class="settings-close-x dev-card-close" style="top: 12px; right: 12px;">×</button>
    <h3 class="dev-card-title">Dev Mode Tools</h3>
    <p class="dev-card-desc">Bấm nút để bật/tắt hoặc kích hoạt chức năng, không cần nhớ phím tắt.</p>

    <div class="dev-section">
        <h4>Chế độ bật/tắt</h4>
        <div class="dev-button-grid">
            <button class="dev-toggle-btn" data-dev-toggle="god" title="Phím tắt: G">🛡️ Bất tử</button>
            <button class="dev-toggle-btn" data-dev-toggle="onehit" title="Phím tắt: M">⚔️ 1 Hit Kill</button>
            <button class="dev-toggle-btn" data-dev-toggle="walls" title="Phím tắt: N">🧱 Tường</button>
        </div>
    </div>

    <div class="dev-section">
        <h4>Hành động nhanh</h4>
        <div class="dev-button-grid">
            <button class="dev-action-btn" data-dev-key="h">❤️ Hồi đầy HP</button>
            <button class="dev-action-btn" data-dev-key="o">🔁 Reset ván đấu</button>
            <button class="dev-action-btn" data-dev-key="f">⚡ Nạp siêu nhanh</button>
            <button class="dev-action-btn" data-dev-key="b">🔫 Tạo 1 viên đạn</button>
        </div>
    </div>

    <div class="dev-section">
        <h4>Spawn Buff / Debuff</h4>
        <div class="dev-button-grid dev-button-grid--compact">
            <button class="dev-action-btn" data-dev-key="z">💊 Hồi máu</button>
            <button class="dev-action-btn" data-dev-key="2">🏃 Tăng tốc</button>
            <button class="dev-action-btn" data-dev-key="c">🎯 Đạn tự dẫn</button>
            <button class="dev-action-btn" data-dev-key="v">🕵️‍♂️ Tàng hình</button>
            <button class="dev-action-btn" data-dev-key="5">📏 Thu nhỏ</button>
            <button class="dev-action-btn" data-dev-key="6">🛡️ Khiên</button>
            <button class="dev-action-btn" data-dev-key="7">🔄 Nạp nhanh</button>
            <button class="dev-action-btn" data-dev-key="8">🪖 Đạn to</button>
            <button class="dev-action-btn" data-dev-key="9">👥 Phân thân</button>
            <button class="dev-action-btn" data-dev-key="0">🔫 Bắn chùm</button>
            <button class="dev-action-btn" data-dev-key="q">↺ Nảy vô hạn</button>
            <button class="dev-action-btn" data-dev-key="r">💥 Đạn nổ</button>
            <button class="dev-action-btn" data-dev-key="u">⤫ Đạn xuyên</button>
            <button class="dev-action-btn" data-dev-key="i">☠️ Đạn độc</button>
            <button class="dev-action-btn" data-dev-key="p">☢️ Bom nguyên tử</button>
            <button class="dev-action-btn" data-dev-key="j">🌋 Dung nham</button>
            <button class="dev-action-btn" data-dev-key="x">🔥 Cuồng nộ</button>
            <button class="dev-action-btn" data-dev-key="y">🪨 Địch khổng lồ</button>
            <button class="dev-action-btn" data-dev-key="e">🔁 Đảo phím</button>
            <button class="dev-action-btn" data-dev-key="t">⛓️ Trói chân</button>
            <button class="dev-action-btn" data-dev-key="k">🤐 Câm lặng</button>
            <button class="dev-action-btn" data-dev-key="l">🌀 Thôi miên</button>
        </div>
    </div>

    <div class="dev-section">
        <h4>Test Boss Mode</h4>
        <div class="dev-button-grid">
            <button class="dev-action-btn" data-dev-key="1">✨ Thêm tất cả buff</button>
            <button class="dev-action-btn" data-dev-key="3">🧹 Xóa tất cả buff</button>
        </div>
    </div>
</div>
'@

$newContent = [regex]::Replace($content, $pattern, $replacement)
if ($newContent -eq $content) {
    Write-Error 'Không tìm thấy khối Dev Mode cũ để thay thế.'
    exit 1
}

Set-Content $path $newContent
