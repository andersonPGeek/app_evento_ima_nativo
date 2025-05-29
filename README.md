# app_evento_ima_nativo

Aplicativo de eventos (IMA) em React Native + Expo

## Pré-requisitos
- Node.js >= 18
- Yarn ou npm
- Expo CLI (`npm install -g expo-cli`)

## Instalação

```bash
npm install
# ou
yarn install
```

## Rodando em modo desenvolvimento

```bash
expo start
```

Abra o app Expo Go no seu celular e escaneie o QR Code.

## Build para produção

### Android (APK ou AAB)
```bash
expo build:android
# ou (Expo SDK 46+)
expo run:android
```

### iOS
```bash
expo build:ios
# ou (Expo SDK 46+)
expo run:ios
```

## Publicação OTA (Over-the-Air)
```bash
expo publish
```

## Observações
- Certifique-se de configurar as variáveis de ambiente e permissões necessárias para câmera e internet.
- O app utiliza autenticação, QR Code, WebView, integração com APIs REST e navegação condicional por role.

---

Dúvidas? Consulte a documentação do [Expo](https://docs.expo.dev/) e do [React Native](https://reactnative.dev/). 