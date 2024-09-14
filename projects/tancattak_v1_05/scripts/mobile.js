var devModeBtn = document.getElementById("open-close-dev");
var interactBtn = document.getElementById("interact-btn");

interactBtn.ontouchstart = function() {
	keysDown["e"] = true;
}

interactBtn.ontouchend = function() {
	keysDown["e"] = false;
}

window.addEventListener("load", () => {
    if (trueDev == false) {
        devModeBtn.style.display = "none";
    }

	if (mobile == false) {
		interactBtn.style.display = "none";
	}
});

devModeBtn.onclick = function() {
    if (trueDev == true) {
		if (devMode == true) {
			setPlayerStats(true);
			devMode = false;
		} else {
			devMode = true;
		}
	}
}