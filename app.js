let a = document.getElementById("collapsible")

a.addEventListener("click", function() {
    a.classList.toggle("active");
    let content = a.nextElementSibling;
    if (content.style.display === "flex") {
      content.style.display = "none";
    } else {
      content.style.display = "flex";
      content.style.flexDirection = "column";
    }
});


