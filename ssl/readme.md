1. `openssl genpkey -algorithm RSA -out key.pem -pkeyopt rsa_keygen_bits:2048`
2. `openssl req -new -key key.pem -out cert.csr`
3. `openssl x509 -req -in cert.csr -signkey key.pem -out cert.pem -days 36500`
4. (Optional) `cat cert.pem key.pem > fullchain.pem`