# ⚠️ VARIÁVEIS NECESSÁRIAS PARA O FIREBASE ADMIN SDK

Adicione estas variáveis ao arquivo `.env.local` na raiz do projeto `paineladm`:

```env
# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=paineladmexperimenteai
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@paineladmexperimenteai.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC4x0BVIPU3EvV8\nkeByr+Hg7sFkUEotPXvGp+yN79Vq8XDjkAAkWeNG612l/StymQPXW+Wn7woZeeXn\nlIQ3Fuog4+2qf3YVnkN7AgK3D46jLaAoAU21xZsO3jUFAjZ/RFy6l1syrkl59O/G\nmAlb6XE6EXge9/XGPSIVd/bKpOHseFi4v6McZ+mxehPc+u9ssWKv8wBfRJOXiP1s\naGj1s0MiRUO8ogCDTL33gbzwzc/GPwKRx9eD7P9xp2KLyZaZgB7opmQNbvmIdF4N\nlRMtpN4BpAF8iuY0nTjyXr+xmjuJU3iGvZ/7T7C+HBUPcU9wLEsK8zPMDFGRg3oi\nKIQ4PShzAgMBAAECggEABqzQAqNDqH8rVhow+QOojcciPlz2KQc5EvabAY+h7pCV\nSus3ThjfMH8tLWNlb+jeLif4NmZYv43bQ8/mLNVLlO+W9NtQ6TwD5QwwC+voc7Wg\nvQE7DO98B//3+1vWmyddkDIKjdyk895o0QxJ/kODHx1lcPz1KHmp4wun4y8sqC2r\nDYu36RJ+pl4rULATpgi7AnPONNN6TcSyEJxYtA9iFLxzjvx9+pIgYuOHWcH/RgJb\ntsnZTekncN8jLY0Mfc8LmROb5eAHEn5NzDvDKQbkzZDdrTczFt5LeQoAkjKZdFPW\nu+SdcIBezDhGx+GfCCm2Uq8yYkMMsEeYNzWS4GP10QKBgQDmOpXbstt5wCjryEeK\nxGJEVyUl3VlH/0k0EMNvAyyY2w4DD4Yyr8CBnYB+it0SrBuSLcyM7GB9nTlCoU/O\npqlHRLU7OPj1zoxyJZMpFo/YV16s+pFYSc7aALYAyNR1r2xlVNizXBz2raWfLfNq\nOiRFUsg2jdA+GxezBaDCNw2tMQKBgQDNdj2EgHuLehFymToWhVd+dJ0flsS7iabM\nn3O+KTse1Jfxo6RE3ykVlcGjCYFAlrDnex1liubrr+1xiM8XfopZi+oiPFQs3iSo\n3G5TwcLOk6c3aWNvhmtJOkWT59XCgcxcKIDQK7wg/sZ6MGJG/BnPuByZtomce6J+\nFxeru8h24wKBgA4oQBrYbsKX3GxTToLr/JbzPOeNKvZQbnHzLfFfophrr/rkM35e\nbFoME2C0rU9+odtlUZTA3FYdGu5L+RpeCT7GrNZNdJG49831HY2DQ6ksBjhg2Bsz\nvrKNJKP7tYTfGq1IgGLXITjSCMM3EibQGHbi1kj0g3+uLtDlYbNPq1mhAoGBAJQ7\nRDK+R2PfU4ssRR5OYUtYcquBqLnsm6xxNZ3yPTcHBgBNoYwWvJtYCfXIO7oPfd3j\nktfZmLRdnp8UpuQ6ZTIpoWfFwq0EL8qsDeTbm+JR4Ig3voeNoQWZxuzoi+3imz+5\n8QU/KGFdrnAlTCIOa8jS+b9kVG/TOu5hVrCNsBklAoGBAJkBzM9HEcCBphbtwKvI\nLxZR+iGPSIQ+XVxlLa3KKC0eY2DODUhzm02XgBr7srLqSIC+A34mA8FH1TEdQ/ph\nNoXZ4u0d1nB4dBFvpBcw3BnHjhVdsL5KWTstn6grEhcq6O6jRdghD4ZDkR/ocasG\n6O2B+kK9vFtNSW/a7+Vo2UT6\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=paineladmexperimenteai.firebasestorage.app
```

## ⚠️ IMPORTANTE:

1. **Abra o arquivo `.env.local`** na raiz do projeto `paineladm` (E:\projetos\paineladm\.env.local)
2. **Adicione as 4 variáveis acima** ao final do arquivo
3. **Salve o arquivo**
4. **Reinicie o servidor** (Ctrl + C e depois `npm run dev -- -p 3000`)

## 📝 Nota sobre FIREBASE_PRIVATE_KEY:

A chave privada deve estar entre aspas duplas (`"`) e os `\n` devem ser mantidos como estão (não substitua por quebras de linha reais).


