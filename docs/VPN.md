# VPN individual — como funciona e como colocar no ar

## O que o NuvemX faz e o que ele não faz

O app Next.js **não é** o servidor de VPN, e não pode ser. Um túnel VPN precisa de UDP bruto e
acesso ao stack de rede do kernel; a Vercel (e qualquer plataforma serverless) só executa funções
HTTP de curta duração. Isso é limitação da plataforma, não do código.

O que o NuvemX é: o **painel de controle** da sua VPN.

```
┌─────────────────────┐        HTTPS         ┌──────────────────────┐
│  NuvemX (Vercel)    │◄─────────────────────│  VPS com WireGuard   │
│  control plane      │   /api/vpn/nodes/sync│  data plane (o túnel)│
│                     │                      │                      │
│  • cria perfis      │                      │  • agente faz poll   │
│  • gera as chaves   │                      │  • aplica `wg set`   │
│  • aloca os IPs     │                      │  • encaminha tráfego │
│  • serve a URL .conf│                      │                      │
└─────────────────────┘                      └──────────────────────┘
         ▲                                              ▲
         │ URL única de VPN (.conf / QR)                │ túnel WireGuard
         └──────────────── usuário ─────────────────────┘
```

O usuário cria um dispositivo em `/vpn` e recebe **uma URL única** com a config pronta. O VPS
descobre esse novo peer no próximo poll e passa a aceitar a conexão. Sem o VPS, os perfis são
gerados corretamente (chaves reais, importáveis) mas não há para onde conectar.

## 1. Suba um VPS com WireGuard

Qualquer VPS com IP público serve (Hetzner, DigitalOcean, Contabo, Oracle Free Tier...).

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y wireguard

# Chave do servidor — a privada NUNCA sai do VPS
wg genkey | sudo tee /etc/wireguard/server.key | wg pubkey | sudo tee /etc/wireguard/server.pub
sudo chmod 600 /etc/wireguard/server.key
```

`/etc/wireguard/wg0.conf`:

```ini
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = <conteúdo de /etc/wireguard/server.key>

# NAT para dar saída à internet aos clientes (troque eth0 pela sua interface)
PostUp   = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
```

Habilite o encaminhamento de pacotes e suba a interface:

```bash
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-wireguard.conf
sudo sysctl --system
sudo systemctl enable --now wg-quick@wg0
```

Libere a porta UDP 51820 no firewall do provedor **e** no do sistema.

## 2. Registre o node no NuvemX

O node é uma linha em `vpn_servers`. Gere o segredo de sincronização e o hash:

```bash
# Guarde o segredo — ele é mostrado só aqui
SYNC_SECRET=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')
echo "SYNC_SECRET: $SYNC_SECRET"
echo -n "$SYNC_SECRET" | sha256sum | cut -d' ' -f1
```

No SQL Editor do Supabase:

```sql
insert into public.vpn_servers (name, endpoint, public_key, subnet, sync_secret_hash)
values (
  'Node BR-1',
  'seu-ip-ou-dominio:51820',          -- endpoint público
  '<conteúdo de /etc/wireguard/server.pub>',
  '10.8.0.0/24',                      -- precisa bater com o Address do wg0.conf
  '<o sha256 impresso acima>'
);
```

## 3. Instale o agente de sincronização no VPS

`/usr/local/bin/nuvemx-vpn-sync`:

```bash
#!/usr/bin/env bash
set -euo pipefail

NUVEMX_URL="https://seu-app.vercel.app"
SYNC_SECRET="<o segredo do passo 2>"
WG_IFACE="wg0"

payload=$(curl -fsS -H "Authorization: Bearer ${SYNC_SECRET}" \
  "${NUVEMX_URL}/api/vpn/nodes/sync")

# Peers que deveriam existir, vindos do control plane
desired=$(echo "$payload" | jq -r '.peers[].publicKey' | sort)
current=$(wg show "$WG_IFACE" peers | sort)

# Remove peers revogados
comm -13 <(echo "$desired") <(echo "$current") | while read -r key; do
  [ -n "$key" ] && wg set "$WG_IFACE" peer "$key" remove
done

# Adiciona/atualiza os ativos
echo "$payload" | jq -c '.peers[]' | while read -r peer; do
  key=$(echo "$peer" | jq -r '.publicKey')
  psk=$(echo "$peer" | jq -r '.presharedKey')
  ips=$(echo "$peer" | jq -r '.allowedIps')
  pskfile=$(mktemp); printf '%s' "$psk" > "$pskfile"
  wg set "$WG_IFACE" peer "$key" preshared-key "$pskfile" allowed-ips "$ips"
  rm -f "$pskfile"
done

wg-quick save "$WG_IFACE" 2>/dev/null || true
```

```bash
sudo chmod 700 /usr/local/bin/nuvemx-vpn-sync   # contém o segredo
sudo apt install -y jq
```

Rode a cada minuto com systemd (`/etc/systemd/system/nuvemx-vpn-sync.timer`):

```ini
[Unit]
Description=Sincroniza peers da VPN do NuvemX

[Timer]
OnBootSec=30s
OnUnitActiveSec=60s

[Install]
WantedBy=timers.target
```

`/etc/systemd/system/nuvemx-vpn-sync.service`:

```ini
[Unit]
Description=Sincroniza peers da VPN do NuvemX

[Service]
Type=oneshot
ExecStart=/usr/local/bin/nuvemx-vpn-sync
```

```bash
sudo systemctl enable --now nuvemx-vpn-sync.timer
```

## 4. Teste

1. Entre no app, vá em **VPN → Novo dispositivo**.
2. Copie a URL gerada (ou baixe o `.conf`).
3. Importe no app WireGuard (desktop ou celular) e ative.
4. Confira em `https://ifconfig.me` — deve mostrar o IP do seu VPS.
5. No VPS, `sudo wg show` lista o peer e o último handshake.

## Decisões de segurança

- **Chaves privadas dos peers**: geradas no servidor com `crypto.generateKeyPairSync('x25519')` —
  chaves Curve25519 reais, idênticas às do `wg genkey`. Ficam cifradas em repouso com AES-256-GCM,
  chave derivada de `APP_SECRET` via scrypt. Só são decifradas para renderizar a config do próprio
  dono.
- **A URL de VPN** é opaca (24 bytes aleatórios), **expira em 15 minutos** e pode ser rotacionada.
  É propositalmente não autenticada para poder ser aberta num celular deslogado — por isso é
  curta e descartável, mesma lógica dos links de arquivo em `/api/share/[token]`.
- **Tabelas `vpn_*` têm RLS ativa e nenhuma policy para `authenticated`.** Não é esquecimento: a
  linha guarda a chave privada do peer e RLS no Postgres é por linha, não por coluna — não dá para
  esconder uma coluna de um SELECT. O navegador nunca toca nessas tabelas; tudo passa por rotas de
  API que reconstroem o usuário a partir do cookie de sessão e devolvem só colunas seguras.
- **O endpoint de sync** autentica a *máquina*, não um usuário, com o segredo do node comparado em
  tempo constante. Cada node só enxerga os peers atribuídos a ele.
- **Revogação** é soft-delete (`revoked_at`), para o agente conseguir ver o peer sair da lista e
  removê-lo do `wg`, e para o IP do túnel não ser reaproveitado na mesma hora.

## Limites por plano

`plans.vpn_enabled` e `plans.vpn_device_limit` controlam o acesso. Padrão da migração 0006:
Free 1 dispositivo, Starter 3, Pro 5, Business 10. Ajuste no painel admin ou por SQL.
