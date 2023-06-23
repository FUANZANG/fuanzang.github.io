var subject = document.getElementById("subject-div"),
  subjectText = document.getElementById("sub-title"),
  errorDiv = document.getElementById("error-div"),
  darkBtn = document.getElementById("dark-btn"),
  lightBtn = document.getElementById("light-btn"),
  outline_chk = document.getElementById("show-outline"),
  dark_mode = "hsla(0, 0%, 40%, var(--opacity))",
  light_mode = "hsla(0, 0%, 80%, var(--opacity))";
init();
function init() {
  changeSubjectSize();
  changeSubjectBlur();
  light();
  browserSupport();
}
function browserSupport() {
  var a = !!document.documentMode;
  if ("undefined" !== typeof InstallTrigger || a)
    errorDiv.style.display = "block";
}
function changeSubjectSize() {
  var a = document.getElementById("sub-size").value;
  subject.style.width = a + "px";
}
function changeSubjectRadius() {
  var a = document.getElementById("sub-radius").value;
  document.documentElement.style.setProperty("--border-radius", a + "px");
}
function changeSubjectBlur() {
  var a = document.getElementById("sub-blur").value;
  document.documentElement.style.setProperty("--blur", a + "px");
}
function changeSubjectOpacity() {
  var a = document.getElementById("sub-opacity").value;
  document.documentElement.style.setProperty("--opacity", a);
}
function dark() {
  subject.classList.remove("glass-light");
  subject.classList.add("glass-dark");
  document.documentElement.style.setProperty("--color1", "#0e0e0e");
  document.documentElement.style.setProperty("--color2", "#1d1d1d");
  darkBtn.classList.add("active");
  lightBtn.classList.remove("active");
  document.documentElement.style.setProperty(
    "--text-color",
    "rgb(128, 128, 128, calc(var(--opacity)*4))"
  );
}
function light() {
  subject.classList.remove("glass-dark");
  subject.classList.add("glass-light");
  document.documentElement.style.setProperty("--color1", "#a7cee0");
  document.documentElement.style.setProperty("--color2", "#d0dea7");
  lightBtn.classList.add("active");
  darkBtn.classList.remove("active");
  document.documentElement.style.setProperty(
    "--text-color",
    "rgb(255, 255, 255, calc(var(--opacity)*3))"
  );
}
function generateCSS() {
  var a = getComputedStyle(subject),
    b = getComputedStyle(subjectText);
  document.getElementById("bg-color").innerText = a.backgroundColor;
  document.getElementById("box-shadow").innerText = a.boxShadow;
  document.getElementById("wbox-shadow").innerText = a.boxShadow;
  document.getElementById("border").innerText = a.border;
  document.getElementById("border-radius").innerText = a.borderRadius;
  document.getElementById("wborder-radius").innerText = a.borderRadius;
  document.getElementById("color").innerText = b.color;
  document.getElementById("backdrop-filter").innerText = a.backdropFilter;
  document.getElementById("wbackdrop-filter").innerText = a.backdropFilter;
  "undefined" !== typeof InstallTrigger &&
    ((document.getElementById("border-radius").innerText =
      a.borderEndEndRadius),
    (document.getElementById("wborder-radius").innerText =
      a.borderEndEndRadius));
}
function modalOpen() {
  document.getElementById("modal-div").style.display = "flex";
  generateCSS();
}
function modalClose() {
  document.getElementById("modal-div").style.display = "none";
}
function outline() {
  outline_chk.checked
    ? document.documentElement.style.setProperty("--border", "1px")
    : document.documentElement.style.setProperty("--border", "0px");
}
