
const BNB_RPC = "https://bsc-dataseed.binance.org/";

async function bnbRequest(method, params) {
  const response = await fetch(BNB_RPC, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: method,
      params: params
    })
  });

  if (!response.ok) {
    throw new Error("تعذر الاتصال بالشبكة");
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result;
}

async function searchBlockchain() {
  const input = document.getElementById("searchInput");
  const result = document.getElementById("result");

  if (!input || !result) return;

  const address = input.value.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    result.textContent =
      "دخل عنوان محفظة BNB صحيح، يبدأ بـ 0x";
    return;
  }

  result.textContent = "جاري البحث...";

  try {
    const [balance, block] = await Promise.all([
      bnbRequest("eth_getBalance", [address, "latest"]),
      bnbRequest("eth_blockNumber", [])
    ]);

    const bnb = Number(BigInt(balance)) / 1e18;
    const blockNumber = Number(BigInt(block));

    result.textContent =
      "الشبكة: BNB Smart Chain\n" +
      "العنوان: " + address + "\n" +
      "الرصيد: " + bnb.toFixed(6) + " BNB\n" +
      "آخر بلوك: " + blockNumber;

    result.style.whiteSpace = "pre-wrap";

  } catch (error) {
    result.textContent =
      "تعذر جلب البيانات. قد يكون الاتصال المباشر بالشبكة محظوراً من المتصفح.";
  }
}
