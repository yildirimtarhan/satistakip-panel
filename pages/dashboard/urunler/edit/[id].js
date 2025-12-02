<Button
  variant="secondary"
  onClick={async () => {
    const res = await fetch("/api/n11/products/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerCode: form.sku,
        price: form.priceTl,
        stock: form.stock,
      }),
    });

    const data = await res.json();
    alert(data.message);
  }}
>
  N11'e Güncelle
</Button>
