# IIMA Eventos

## 📱 Aplicativo Oficial de Eventos IIMA

O **IIMA Eventos** é um aplicativo móvel completo desenvolvido em React Native para gerenciar e participar de eventos corporativos, conferências e encontros profissionais. Oferece uma experiência integrada para participantes, palestrantes e organizadores de eventos.

## 🚀 Funcionalidades Principais

### 👥 Para Participantes (Usuários)
- **📅 Lista de Eventos**: Visualize todos os eventos disponíveis com informações detalhadas
- **🔍 Busca por Palestrantes**: Encontre eventos específicos através do nome dos palestrantes
- **📋 Agenda Completa**: Acesse a programação completa com horários, palestras e palestrantes
- **🗺️ Mapa do Evento**: Visualize a localização e layout do evento
- **⭐ Sistema de Avaliação**: Avalie palestras e forneça feedback
- **👤 Perfil de Palestrantes**: Visualize biografias e redes sociais dos palestrantes
- **🎫 QR Code do Ingresso**: Acesse seu ingresso digital para entrada no evento
- **📍 Localização**: Obtenha direções para o local do evento
- **📞 Contato com Expositores**: Entre em contato com empresas expositoras

### 🏢 Para Expositores (Estandes)
- **📱 Check-in de Visitantes**: Leia QR codes para registrar presença
- **📊 Lista de Check-ins**: Visualize todos os visitantes registrados
- **📈 Relatórios**: Acompanhe estatísticas de visitantes
- **👥 Cadastro de Usuários**: Registre novos participantes (apenas admin)

### 🎯 Funcionalidades Especiais
- **🔒 Sistema de Autenticação**: Login seguro com diferentes níveis de acesso
- **⚡ Cache Inteligente**: Carregamento rápido com cache otimizado
- **📱 Interface Responsiva**: Design adaptável para diferentes dispositivos
- **🌐 Sincronização Online**: Dados sempre atualizados em tempo real
- **🔔 Notificações**: Mantenha-se informado sobre eventos e atualizações

## 🛠️ Tecnologias Utilizadas

- **React Native**: Framework principal para desenvolvimento mobile
- **Expo**: Plataforma para desenvolvimento e build
- **React Navigation**: Navegação entre telas
- **AsyncStorage**: Armazenamento local de dados
- **Fetch API**: Comunicação com backend
- **React Native WebView**: Visualização de conteúdo web
- **React Native QR Code**: Leitura de códigos QR
- **Date-fns**: Manipulação de datas
- **React Native Vector Icons**: Ícones da interface

## 📊 Estrutura do Projeto

```
src/
├── api/                 # Configurações de API
├── contexts/           # Contextos React (Auth)
├── navigation/         # Configuração de navegação
├── screens/           # Telas do aplicativo
│   ├── EventListScreen.js      # Lista de eventos
│   ├── EventScheduleScreen.js  # Agenda do evento
│   ├── SponsorShowcaseScreen.js # Expositores
│   ├── CheckinScreen.js        # Check-in
│   ├── CheckinListScreen.js    # Lista de check-ins
│   ├── LoginScreen.js          # Tela de login
│   ├── TicketScreen.js         # QR Code do ingresso
│   └── ...
└── assets/            # Recursos visuais
```

## 🔐 Níveis de Acesso

### 👤 Usuário Padrão
- Visualizar eventos e agenda
- Avaliar palestras
- Acessar informações de palestrantes
- Contatar expositores
- Visualizar QR code do ingresso

### 🏢 Expositor
- Todas as funcionalidades do usuário
- Realizar check-in de visitantes
- Visualizar lista de check-ins
- Acessar relatórios

### 🏢 Expositor Admin
- Todas as funcionalidades do expositor
- Cadastrar novos usuários
- Gerenciar permissões

## 📱 Compatibilidade

- **Android**: 6.0 (API 23) ou superior
- **iOS**: 12.0 ou superior
- **Dispositivos**: Smartphones e tablets

## 🚀 Como Executar

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Configurar Expo**:
   ```bash
   npx expo install
   ```

3. **Executar em desenvolvimento**:
   ```bash
   npx expo start
   ```

4. **Build para produção**:
   ```bash
   eas build --platform all
   ```

## 🔧 Configuração

### Variáveis de Ambiente
- `API_BASE`: URL base da API backend
- `API_BASE_APP`: URL do aplicativo web

### Permissões Necessárias
- **Câmera**: Para leitura de QR codes
- **Localização**: Para direções e mapas
- **Internet**: Para sincronização de dados

## 📈 Recursos Técnicos

### Performance
- Cache inteligente para dados estáticos
- Lazy loading de imagens
- Otimização de renderização
- Compressão de assets

### Segurança
- Autenticação JWT
- Criptografia de dados sensíveis
- Validação de entrada
- Sanitização de dados

### UX/UI
- Design Material Design
- Animações suaves
- Feedback visual
- Acessibilidade

## 🌟 Diferenciais

- **Interface Intuitiva**: Design moderno e fácil de usar
- **Funcionalidades Completas**: Cobre todo o ciclo do evento
- **Performance Otimizada**: Carregamento rápido e responsivo
- **Segurança Robusta**: Proteção de dados e privacidade
- **Suporte Multiplataforma**: Funciona em Android e iOS
- **Atualizações em Tempo Real**: Dados sempre sincronizados

## 📞 Suporte

Para suporte técnico ou dúvidas:
- **E-mail**: contato@lyfiti.com.br
- **Documentação**: Disponível no repositório
- **Issues**: Reporte bugs via GitHub

## 📄 Licença

Este projeto é proprietário da IIMA. Todos os direitos reservados.

---

**Desenvolvido com ❤️ para a comunidade IIMA** 