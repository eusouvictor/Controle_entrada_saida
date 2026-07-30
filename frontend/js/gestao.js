// Micro-interaction: Simulate adding/editing feedback
function showToast() {
    const toast = document.getElementById('toast');
    if(!toast) return;
    toast.classList.remove('translate-y-32', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-32', 'opacity-0');
    }, 3000);
}

// Add subtle hover effects for the cards
const cards = document.querySelectorAll('.bg-surface-container-lowest');
cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.classList.add('scale-[1.01]');
    });
    card.addEventListener('mouseleave', () => {
        card.classList.remove('scale-[1.01]');
    });
});