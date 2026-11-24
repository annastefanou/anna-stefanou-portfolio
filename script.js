const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#site-navigation");
const editButton = document.querySelector("#edit-toggle");
const resetButton = document.querySelector("#edit-reset");
const editStatus = document.querySelector("#edit-status");
const editableFields = [...document.querySelectorAll("[data-editable]")];
const editsStorageKey = "anna-personal-portfolio-edits";
const imagesStorageKey = "anna-personal-portfolio-images";
let storageError = false;
let savedImages = {};

const imageTargets = {
  hero: "hero-photo",
  "me-one": "me-photo-one",
  "me-two": "me-photo-two",
  "studies-one": "studies-photo-one",
  "studies-two": "studies-photo-two",
  "university-one": "university-photo-one",
  "university-two": "university-photo-two"
};

function appendSafeMarkup(parent, sourceNode) {
  for (const child of sourceNode.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      parent.append(document.createTextNode(child.textContent));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (["DIV", "P"].includes(child.tagName)) {
        if (parent.hasChildNodes() && parent.lastChild.tagName !== "BR") parent.append(document.createElement("br"));
        appendSafeMarkup(parent, child);
      } else if (["BR", "EM", "STRONG", "B", "I"].includes(child.tagName)) {
        const safeElement = document.createElement(child.tagName.toLowerCase());
        appendSafeMarkup(safeElement, child);
        parent.append(safeElement);
      } else {
        appendSafeMarkup(parent, child);
      }
    }
  }
}

function restoreSafeMarkup(field, markup) {
  const parsed = new DOMParser().parseFromString(markup, "text/html");
  const safeContent = document.createDocumentFragment();
  appendSafeMarkup(safeContent, parsed.body);
  field.replaceChildren(safeContent);
}

function updateEmailLink() {
  const emailField = document.querySelector('[data-editable="contact-email"]');
  const email = emailField.textContent.trim();
  const link = document.querySelector(".contact-email");
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    link.href = `mailto:${email}`;
  } else {
    link.removeAttribute("href");
  }
}

try {
  const saved = JSON.parse(localStorage.getItem(editsStorageKey) || "{}");
  for (const field of editableFields) {
    const value = saved[field.dataset.editable];
    if (typeof value === "string") restoreSafeMarkup(field, value);
  }
} catch {
  storageError = true;
}

updateEmailLink();

function showSavedImage(targetName) {
  const photoId = imageTargets[targetName];
  const photo = document.querySelector(`#${photoId}`);
  const removeButton = document.querySelector(`[data-remove-image="${targetName}"]`);
  if (!photo) return;
  if (savedImages[targetName]) {
    photo.src = savedImages[targetName];
    photo.hidden = false;
    if (removeButton) removeButton.hidden = false;
  } else {
    photo.hidden = true;
    photo.removeAttribute("src");
    if (removeButton) removeButton.hidden = true;
  }
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("The image could not be loaded."));
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

try {
  savedImages = JSON.parse(localStorage.getItem(imagesStorageKey) || "{}");
} catch {
  savedImages = {};
}

for (const targetName of Object.keys(imageTargets)) showSavedImage(targetName);

for (const input of document.querySelectorAll('[type="file"][accept^="image"]')) {
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      editStatus.hidden = false;
      editStatus.textContent = "Choose a PNG, JPG, or WebP image.";
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      editStatus.hidden = false;
      editStatus.textContent = "The image must be smaller than 15 MB.";
      return;
    }
    try {
      const targetName = input.id.replace("-upload", "");
      const dataUrl = await resizeImage(file);
      savedImages[targetName] = dataUrl;
      localStorage.setItem(imagesStorageKey, JSON.stringify(savedImages));
      showSavedImage(targetName);
      editStatus.hidden = false;
      editStatus.textContent = "The photo was added.";
      window.setTimeout(() => {
        if (editStatus.textContent === "The photo was added.") editStatus.hidden = true;
      }, 4000);
    } catch (error) {
      editStatus.hidden = false;
      editStatus.textContent = error.message || "The photo could not be added.";
    }
  });
}

for (const removeButton of document.querySelectorAll("[data-remove-image]")) {
  removeButton.addEventListener("click", () => {
    const targetName = removeButton.dataset.removeImage;
    delete savedImages[targetName];
    try {
      localStorage.setItem(imagesStorageKey, JSON.stringify(savedImages));
    } catch {
      storageError = true;
    }
    showSavedImage(targetName);
  });
}

function setEditing(isEditing) {
  document.body.classList.toggle("is-editing", isEditing);
  editButton.setAttribute("aria-pressed", String(isEditing));
  editButton.innerHTML = isEditing
    ? 'Finish <span aria-hidden="true">✓</span>'
    : 'Write <span aria-hidden="true">↗</span>';
  resetButton.hidden = !isEditing;
  editStatus.hidden = !isEditing;
  editStatus.textContent = storageError
    ? "Your browser cannot save these changes."
    : "Editing is on — select one of the outlined text areas.";

  for (const field of editableFields) {
    if (isEditing) {
      field.setAttribute("contenteditable", "plaintext-only");
      field.setAttribute("spellcheck", "true");
    } else {
      field.removeAttribute("contenteditable");
      field.removeAttribute("spellcheck");
    }
  }

  if (isEditing) {
    window.setTimeout(() => {
      if (editButton.getAttribute("aria-pressed") === "true") editStatus.hidden = true;
    }, 5000);
  }
}

editButton.addEventListener("click", () => {
  setEditing(editButton.getAttribute("aria-pressed") !== "true");
});

for (const field of editableFields) {
  field.addEventListener("input", () => {
    try {
      const saved = JSON.parse(localStorage.getItem(editsStorageKey) || "{}");
      saved[field.dataset.editable] = field.innerHTML;
      localStorage.setItem(editsStorageKey, JSON.stringify(saved));
      storageError = false;
    } catch {
      storageError = true;
      editStatus.hidden = false;
      editStatus.textContent = "The changes could not be saved.";
    }
    if (field.dataset.editable === "contact-email") updateEmailLink();
  });
}

resetButton.addEventListener("click", () => {
  if (!window.confirm("Reset all text and photos to their original placeholders?")) return;
  try {
    localStorage.removeItem(editsStorageKey);
    localStorage.removeItem(imagesStorageKey);
  } catch {
    storageError = true;
  }
  window.location.reload();
});

document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventEvent?.();
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const emailField = document.querySelector('[data-editable="contact-email"]');
  const email = emailField.textContent.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    editStatus.hidden = false;
    editStatus.textContent = "Add a valid contact email first.";
    return;
  }
  const subject = encodeURIComponent(`Message from ${form.get("name")}`);
  const body = encodeURIComponent(`Name: ${form.get("name")}\nEmail: ${form.get("email")}\n\n${form.get("message")}`);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
});

function setMenuOpen(isOpen) {
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  navigation.classList.toggle("is-open", isOpen);
}

menuButton.addEventListener("click", () => setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true"));
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false);
    menuButton.focus();
  }
});
