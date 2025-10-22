# CardGenius Statement Processor

A comprehensive credit card statement processing system that uses LLM-based parsing to extract transaction data from PDF statements and provide spending insights.

## 🚀 Features

### Core Functionality
- **LLM-based PDF Parsing**: Uses OpenAI GPT to extract transaction data from encrypted PDF statements
- **Real-time Processing**: Live progress tracking with WebSocket-like updates
- **Bank-specific Password Generation**: Automated password cracking for 8+ Indian banks
- **Smart Categorization**: 21 spending categories with intelligent merchant detection
- **Gmail Integration**: Automatic statement detection and download from Gmail

### Supported Banks
- **IDFC First Bank** - DDMM password format
- **Axis Bank** (Magnus, Flipkart) - Name4+DDMM format
- **State Bank of India** - DOB+Last4 format
- **YES Bank** (Klick) - Name4+DDMM format
- **HDFC Bank** (Regalia) - Name4+DDMM format
- **HSBC India** - DDMMYY+Card6 format
- **RBL Bank** - Name4+DDMMYY format

### Advanced Features
- **Amount Parsing Fix**: Automatic paise-to-rupees conversion
- **Bank Fees Exclusion**: Filters out interest, GST, and bank charges
- **Enhanced Categorization**: 
  - DREAMPLUG/CRED → Rent payments
  - VPS → Electricity bills
  - PhonePe Utility → Mobile bills
  - UPI transactions → Separate category
- **Card Matching**: Intelligent card-to-statement association
- **Dashboard Analytics**: Monthly spending breakdown by category and card

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **PDF Processing**: qpdf, pdf-lib, pdfjs-dist
- **LLM Integration**: OpenAI GPT-4
- **Email**: Gmail API with OAuth2
- **Storage**: Browser localStorage, in-memory progress tracking

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create `.env.local` file:
   ```env
   # OpenAI API
   OPENAI_API_KEY=your_openai_api_key
   
   # Gmail OAuth2
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth2/callback
   
   # CardGenius API (optional)
   CG_API_KEY=your_cg_api_key
   CG_API_SECRET=your_cg_api_secret
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Gmail Setup
1. Enable Gmail API in Google Cloud Console
2. Create OAuth2 credentials
3. Add authorized redirect URIs
4. Grant necessary scopes: `gmail.readonly`, `gmail.modify`

### OpenAI Setup
1. Get API key from OpenAI platform
2. Ensure sufficient credits for LLM processing
3. Configure model preferences in code

## 📊 Usage

### Basic Workflow
1. **Connect Gmail**: Authorize Gmail access via OAuth2
2. **Sync Statements**: Automatically detect and download statements
3. **Process Statements**: LLM parsing with real-time progress
4. **Review Results**: Dashboard with categorized spending analysis
5. **Optimize**: Get card recommendations based on spending patterns

### API Endpoints
- `POST /api/gmail/sync` - Sync Gmail for statements
- `POST /api/gmail/process-statements-v2` - Process statements with LLM
- `GET /api/gmail/process-statements-progress` - Real-time progress updates
- `POST /api/cg/optimize` - Get card recommendations

## 🎯 Key Improvements

### Recent Fixes
- **Amount Parsing**: Fixed paise-to-rupees conversion with universal rules
- **Bank Fees Exclusion**: Automatic filtering of interest, GST, and charges
- **Categorization**: Enhanced rules for rent, utilities, and UPI payments
- **Real-time UI**: Smooth progress tracking without timer jumps
- **Card Aggregation**: Proper bank-card separation in dashboard

### Performance Optimizations
- **Password Caching**: Intelligent password hint analysis
- **Batch Processing**: Efficient statement processing pipeline
- **Progress Tracking**: Real-time updates without blocking
- **Error Handling**: Graceful failure recovery

## 🔒 Security

- **No Secrets in Frontend**: All API keys server-side only
- **OAuth2 Least Privilege**: Minimal required Gmail scopes
- **Encryption at Rest**: Sensitive data encrypted
- **Masked PAN**: Card numbers masked in logs
- **Input Validation**: JSON schema validation for LLM output

## 📈 Analytics

The system tracks:
- Processing latency and success rates
- Categorization accuracy
- User spending patterns
- Card utilization analysis
- Optimization recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed description
3. Include logs and error messages
4. Provide steps to reproduce

## 🎉 Acknowledgments

- OpenAI for GPT-4 API
- Google for Gmail API
- Next.js team for the framework
- All contributors and testers