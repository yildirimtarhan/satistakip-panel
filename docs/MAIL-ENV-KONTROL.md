# E-posta (.env) Kontrol Listesi — Brevo + Zoho

Şifre sıfırlama veya diğer mailler gitmiyorsa aşağıdaki adımları kontrol edin.

---

## 1. Değişken isimleri (büyük/küçük harf önemli)

Kodun beklediği **tam** isimler:

| Değişken | Zorunlu (Brevo) | Açıklama |
|----------|------------------|----------|
| `BREVO_API_KEY` | Evet | Brevo panel → SMTP & API → API Keys → "Generate a new API key" |
| `SMTP_FROM_EMAIL` | Evet | Gönderici e-posta (Brevo'da doğrulanmış olmalı) |
| `SMTP_FROM_NAME` | Hayır | Gösterilen ad (örn. "Satış Takip") |
| `NEXT_PUBLIC_BASE_URL` | Önerilen | Sitenin tam adresi (örn. https://satistakip.online) |

**Yanlış örnekler:** `Brevo_Api_Key`, `BREVO_API_KEY ` (sonda boşluk), `smtp_from_email` → çalışmaz.  
**Önemli:** Değer atarken mutlaka **eşittir** kullanın: `BREVO_API_KEY=...` — **İki nokta üst üste (`:`) kullanırsanız değişken okunmaz**, mail gönderilmez.

---

## 2. Brevo panel ayarları

1. **Gönderici (Sender) doğrulama**  
   Brevo → **Senders & IP** → Gönderici e-postayı ekleyin ve **doğrulayın**.  
   `SMTP_FROM_EMAIL` bu doğrulanmış adres olmalı (veya bu domain’e ait bir adres).

2. **Domain doğrulama**  
   **Domains** bölümünde gönderim yapacağınız domain (örn. `satistakip.online`) doğrulanmış olmalı.

3. **API Key**  
   **SMTP & API** → **API Keys** → Yeni key oluştur. Key’i kopyalayıp `.env` içinde `BREVO_API_KEY=xkeysib-...` şeklinde yapıştırın (tırnak yok, başında/sonunda boşluk yok).

---

## 3. Canlı sunucuda (Render / Vercel / vb.)

- Ortam değişkenleri **sunucu panelinden** girilmiş olmalı (sadece yerel `.env` yetmez).
- Değişken ekledikten veya değiştirdikten sonra **redeploy** (yeniden deploy) yapın; bazen bir kez yeniden başlatma gerekir.

---

## 4. Zoho (SMTP yedek)

Brevo çalışmazsa şifre sıfırlama Zoho SMTP ile denenir. Zoho için:

| Değişken | Örnek |
|----------|--------|
| `SMTP_HOST` | `smtp.zoho.eu` (EU) veya `smtp.zoho.com` |
| `SMTP_PORT` | `587` (TLS) veya `465` (SSL) |
| `SMTP_USER` | Zoho e-posta adresiniz |
| `SMTP_PASS` | Zoho uygulama şifresi (normal giriş şifresi değil) |
| `MAIL_FROM` | Gönderici adres (genelde SMTP_USER ile aynı) |

Zoho’da **Uygulama şifresi** oluşturup `SMTP_PASS` olarak kullanın.

---

## 5. Hata mesajına göre kontrol

- **"BREVO_API_KEY env eksik"** → Sunucuda bu değişken yok veya yanlış yazılmış. Canlıda env’i kontrol edip redeploy edin.
- **"SMTP_FROM_EMAIL env eksik"** → Bu değişkeni ekleyin; değer Brevo’da doğrulanmış bir e-posta olsun.
- **"Sender email not verified" / "Invalid sender"** → Brevo’da Senders bölümünden bu e-postayı doğrulayın.
- **"Unauthorized" / 401** → API key yanlış veya silinmiş; yeni key oluşturup `.env` / sunucu env’ini güncelleyin.
- SMTP hatası (Zoho) → `SMTP_USER` / `SMTP_PASS` ve port (587/465) doğru mu kontrol edin.

---

## 6. Örnek .env (yerel / canlı)

```env
# Brevo
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM_EMAIL=noreply@satistakip.online
SMTP_FROM_NAME=Satis Takip
NEXT_PUBLIC_BASE_URL=https://satistakip.online

# Zoho (şifre sıfırlama yedek)
SMTP_HOST=smtp.zoho.eu
SMTP_PORT=587
SMTP_USER=noreply@satistakip.online
SMTP_PASS=your_zoho_app_password
MAIL_FROM=noreply@satistakip.online
```

Bu listeyi kontrol ettikten sonra şifremi unuttum sayfasında tekrar deneyin; hata alırsanız sayfada görünen **detay** mesajı Brevo/SMTP’den gelen sebebi gösterecektir.
