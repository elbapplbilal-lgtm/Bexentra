
function searchBlockchain() {
  const input = document.getElementById("searchInput");
  const result = document.getElementById("result");

  if (!input || !result) return;

  const value = input.value.trim();

  if (!value) {
    result.textContent = "دخل عنوان المحفظة";
    return;
  }

  result.textContent = "جاري البحث...";
  window.open(
    "https://solscan.io/account/" + encodeURIComponent(value),
    "_blank"
  );
  result.textContent = "تم فتح البحث في Solscan";
}
