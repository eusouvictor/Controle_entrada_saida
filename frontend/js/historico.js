// Simple row deletion micro-interaction
document.querySelectorAll('button[title="Cancelar"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // normalize target inside button (icon/button text)
        const clicked = e.currentTarget || e.target;
        const row = clicked.closest('tr');
        if(!row) return;
        if(confirm('Tem certeza que deseja cancelar esta autorização?')) {
            row.style.opacity = '0';
            row.style.transform = 'translateX(20px)';
            row.style.transition = 'all 0.4s ease';
            setTimeout(() => row.remove(), 400);
        }
    });
});

// Hover scale interaction for bento cards
document.querySelectorAll('.bento-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        if(!card.querySelector('table')) {
           card.style.transform = 'translateY(-2px)';
           card.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.08)';
        }
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
    });
});