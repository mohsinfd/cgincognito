// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.BOOST_BASE_URL = 'https://trial-cc.boostscore.in'
process.env.BOOST_API_KEY = 'test_api_key'
process.env.BOOST_API_SECRET = 'test_api_secret'
process.env.GOOGLE_CLIENT_ID = 'test_client_id'
process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret'
process.env.OAUTH_JWT_SIGNING_KEY = 'test_jwt_key_min_32_characters_long'
process.env.ENCRYPTION_KMS_KEY = 'test_encryption_key_base64'
process.env.WEB_ORIGIN = 'http://localhost:3000'
process.env.MAX_UPLOAD_MB = '10'

