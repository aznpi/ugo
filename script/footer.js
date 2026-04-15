document.querySelectorAll('.footer-heading').forEach(heading => {
    heading.addEventListener('click', () => {
        if (window.innerWidth < 768) {
            const parent = heading.parentElement;
            
            // Optional: Close other open menus (Accordion style)
            document.querySelectorAll('.footer-column').forEach(col => {
                if (col !== parent) col.classList.remove('is-open');
            });

            parent.classList.toggle('is-open');
            
            // Rotate the arrow icon
            const isOpen = parent.classList.contains('is-open');
            
        }
    });
});