# Site de consultoria Go Live Way (versão v02)

Site estático (HTML, CSS e JavaScript simples). Não precisa de build, Node, base de dados nem CDN externo. A fonte Inter está incluída em `assets/fonts/`.

## Estrutura

```
index.html              Página única (texto em português, idioma por omissão)
assets/css/style.css    Estilos
assets/js/main.js       CONFIGURAÇÃO dos contactos + lógica (idioma, tema, menu)
assets/js/i18n.js       Traduções para inglês
assets/fonts/           Fonte Inter (woff2, licença SIL OFL)
assets/img/             Imagens, ícones, imagem Open Graph
```

## Placeholders a preencher

| Placeholder | Onde | O quê |
|---|---|---|
| `CONTACT_EMAIL` | `assets/js/main.js` (bloco `CONFIG`) | Destino dos pedidos do formulário (por omissão `mail@goliveway.win`) |
| `UPDATES_URL` | `assets/js/main.js` (bloco `CONFIG`) | Página/blog/newsletter para informação adicional e atualizações |

O CTA «Marcar chamada de 30 min» abre um formulário (nome, telefone opcional, email obrigatório, descrição). O envio usa [FormSubmit](https://formsubmit.co/) para o email de destino. Na **primeira** submissão, confirme o endereço em `mail@goliveway.win` (email de activação do FormSubmit).
| `SITE_URL` | `index.html` (`<head>`: canonical, hreflang, `og:url`, `og:image`) | Endereço final do site, ex.: `https://www.exemplo.pt` (sem barra final) |
| `[resultado medido: preencher]` | `index.html` caso Planner + `i18n.js` chave `case1.result` | Resultado do Planner |
| `[X h → Y min por relatório]`, `[taxa de erro: preencher]` | `index.html` caso avaliação + `i18n.js` chaves `case2.m1`, `case2.m2` | Métricas antes/depois da avaliação imobiliária |
| `[X h → Y min por documento]`, `[resultado: preencher]` | `index.html` caso licenciamento + `i18n.js` chaves `case3.m1`, `case3.m2` | Métricas do licenciamento |

Enquanto um link não estiver preenchido, o botão correspondente aponta para a secção de contacto (não fica um link partido).

Os placeholders dos resultados aparecem destacados a amarelo (classe `ph`). Depois de colocar os números reais, pode retirar o `class="ph"` para ficarem com aspeto normal.

## Editar textos

- **Português:** diretamente no `index.html`.
- **Inglês:** em `assets/js/i18n.js`. Cada elemento com `data-i18n="chave"` no HTML tem a mesma chave no ficheiro de traduções.
- Ao acrescentar um texto novo, coloque `data-i18n="nova.chave"` no HTML e acrescente `"nova.chave": "..."` em `i18n.js`.

O idioma escolhido fica guardado no navegador (`localStorage`). Também pode abrir diretamente em inglês com `?lang=en`.

## Tema claro / escuro

- Os botões ☀ / ☽ ao lado de PT/EN mudam o tema (no telemóvel ficam no cabeçalho, junto ao menu).
- Na primeira visita segue a preferência do sistema (`prefers-color-scheme`). A escolha fica guardada no navegador.
- O tema é aplicado por um pequeno script no `<head>` do `index.html`, antes de a página ser desenhada, para não haver "flash".
- As cores de cada tema estão no topo de `assets/css/style.css` (`:root` para claro e `:root[data-theme="dark"]` para escuro).

## Paleta (linha gráfica "céu")

- Marca: gradiente `#8FD8FF` → `#3A9EEA` (logótipo, favicon, números dos passos, destaques).
- Tema claro: texto `#0B2236`, links/rótulos `#1A73BA`, botões em gradiente `#1A73BA` → `#125A96` com texto branco (contraste AA).
- Tema escuro: fundo `#06182A`, links/destaques `#8FD8FF`, botões em gradiente céu com texto `#06203A`.
- Todas as cores são variáveis CSS no topo de `assets/css/style.css`.

## Imagens

- `planner-login.jpg`: captura real da página de entrada da aplicação Planner. Pode substituir por uma captura do painel com sessão iniciada (mesmo nome, 1280×800).
- `valuation-flow.svg` e `licensing-flow.svg`: ilustrações genéricas (não são documentos de clientes).
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`: símbolo Go Live Way (o mesmo desenho do logótipo no cabeçalho, que está em SVG dentro do `index.html`).
- `og-image.png` (1200×630): imagem para partilha em redes sociais.

## Pré-visualizar no computador

Pode abrir o `index.html` com duplo clique. Para um teste mais fiel ao servidor:

```bash
cd <pasta do site>
python3 -m http.server 8080
# abrir http://localhost:8080
```

## Publicar num servidor local

Copie o conteúdo da pasta para o servidor, por exemplo para `/var/www/consultoria`.

### nginx

```nginx
server {
    listen 80;
    server_name exemplo.pt www.exemplo.pt;

    root /var/www/consultoria;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # cache de ficheiros estáticos
    location ~* \.(css|js|woff2|png|jpg|svg)$ {
        expires 30d;
        add_header Cache-Control "public";
    }

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Apache

```apache
<VirtualHost *:80>
    ServerName exemplo.pt
    ServerAlias www.exemplo.pt
    DocumentRoot /var/www/consultoria

    <Directory /var/www/consultoria>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType text/css "access plus 30 days"
        ExpiresByType application/javascript "access plus 30 days"
        ExpiresByType font/woff2 "access plus 30 days"
        ExpiresByType image/png "access plus 30 days"
        ExpiresByType image/svg+xml "access plus 30 days"
    </IfModule>
</VirtualHost>
```

```bash
sudo a2ensite consultoria.conf && sudo systemctl reload apache2
```

### HTTPS

Recomendado. Com um domínio público, use o Certbot (Let's Encrypt): `sudo certbot --nginx` ou `sudo certbot --apache`.

## Notas

- Texto na primeira pessoa do plural (nós / we), sem nomes de empresas, bancos, software ou ferramentas técnicas.

- Os resultados dos casos estão como placeholders: não foram inventados números.
- Os clientes dos casos de automação estão anonimizados.
