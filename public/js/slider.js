const banner = document.querySelector(".banner");
const slidesContainer = document.querySelector(".slides");
const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");

if (banner && slidesContainer && slides.length > 0) {
    let currentIndex = 0;
    let startX = 0;
    let isDragging = false;
    let autoSlide;

    function showSlide(index) {
        currentIndex = (index + slides.length) % slides.length;
        slidesContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach(dot => dot.classList.remove("active"));
        if (dots[currentIndex]) dots[currentIndex].classList.add("active");
    }

    function changeSlide(direction) {
        showSlide(currentIndex + direction);
    }

    window.currentSlide = function(index) {
        showSlide(index);
        resetAutoSlide();
    };

    function startAutoSlide() {
        autoSlide = setInterval(() => changeSlide(1), 3000);
    }

    function resetAutoSlide() {
        clearInterval(autoSlide);
        startAutoSlide();
    }

    banner.addEventListener("mousedown", function(e) {
        startX = e.clientX;
        isDragging = true;
        clearInterval(autoSlide);
    });

    banner.addEventListener("mouseup", function(e) {
        if (!isDragging) return;
        let distance = e.clientX - startX;
        if (distance < -50) changeSlide(1);
        else if (distance > 50) changeSlide(-1);
        isDragging = false;
        resetAutoSlide();
    });

    banner.addEventListener("mouseleave", function() {
        if (isDragging) {
            isDragging = false;
            resetAutoSlide();
        }
    });

    banner.addEventListener("touchstart", function(e) {
        startX = e.touches[0].clientX;
        clearInterval(autoSlide);
    }, { passive: true });

    banner.addEventListener("touchend", function(e) {
        let distance = e.changedTouches[0].clientX - startX;
        if (distance < -50) changeSlide(1);
        else if (distance > 50) changeSlide(-1);
        resetAutoSlide();
    }, { passive: true });

    showSlide(0);
    startAutoSlide();
}