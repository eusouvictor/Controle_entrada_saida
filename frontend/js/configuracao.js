function switchTab(tabName) {
    // Update tabs UI
    const tabs = ['departments', 'supervisors', 'branding'];
    tabs.forEach(t => {
        const tabEl = document.getElementById(`tab-${t}`);
        const contentEl = document.getElementById(`content-${t}`);
        
        if (t === tabName) {
            tabEl.classList.add('tab-active');
            tabEl.classList.remove('text-on-surface-variant');
            contentEl.classList.remove('hidden');
        } else {
            tabEl.classList.remove('tab-active');
            tabEl.classList.add('text-on-surface-variant');
            contentEl.classList.add('hidden');
        }
    });
}

// Simple animation on hover for interactive elements
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('mousedown', () => {
        button.classList.add('scale-95');
    });
    button.addEventListener('mouseup', () => {
        button.classList.remove('scale-95');
    });
});