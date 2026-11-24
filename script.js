const banner = document.querySelector(".banner");
const slidesContainer = document.querySelector(".slides");
const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");

let currentIndex = 0;
let startX = 0;
let isDragging = false;
let autoSlide;

function showSlide(index) {
    currentIndex = (index + slides.length) % slides.length;

    slidesContainer.style.transform =
        `translateX(-${currentIndex * 100}%)`;

    dots.forEach(dot => dot.classList.remove("active"));
    dots[currentIndex].classList.add("active");
}

function changeSlide(direction) {
    showSlide(currentIndex + direction);
}

function currentSlide(index) {
    showSlide(index);
    resetAutoSlide();
}

// Tự động chuyển sau 3 giây
function startAutoSlide() {
    autoSlide = setInterval(() => {
        changeSlide(1);
    }, 3000);
}

function resetAutoSlide() {
    clearInterval(autoSlide);
    startAutoSlide();
}

// Kéo chuột
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

// Kéo trên điện thoại
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