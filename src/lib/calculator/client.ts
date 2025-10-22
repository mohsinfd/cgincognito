/**
 * CardGenius Calculator API client
 * Based on PRD Section X
 */

import type { CGSpendVector, CGCalculatorResponse } from '@/types/optimizer';

export class CGCalculatorClient {
  private baseUrl: string;
  private partnerToken?: string;

  constructor(baseUrl?: string, partnerToken?: string) {
    this.baseUrl =
      baseUrl ||
      process.env.CG_CALCULATOR_BASE_URL ||
      'https://card-recommendation-api-v2.bankkaro.com';
    this.partnerToken = partnerToken || process.env.CG_CALCULATOR_PARTNER_TOKEN;
  }

  /**
   * Get card recommendations for a monthly spend vector
   * @param spendVector Monthly spend by category (in INR)
   * @param usePartnerRoute Use partner route vs internal route
   * @returns Card recommendations with savings breakdown
   */
  async getRecommendations(
    spendVector: Partial<CGSpendVector>,
    usePartnerRoute: boolean = false
  ): Promise<CGCalculatorResponse> {
    // Build endpoint
    const endpoint = usePartnerRoute
      ? '/partner/cardgenius/pro'
      : '/cg/api/pro';

    const url = `${this.baseUrl}${endpoint}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (usePartnerRoute && this.partnerToken) {
      headers['partner-token'] = this.partnerToken;
    }

    // Ensure all fields are present (default to 0)
    const fullVector: CGSpendVector = {
      // Monthly spends
      amazon_spends: 0,
      flipkart_spends: 0,
      grocery_spends_online: 0,
      online_food_ordering: 0,
      other_online_spends: 0,
      other_offline_spends: 0,
      dining_or_going_out: 0,
      fuel: 0,
      school_fees: 0,
      rent: 0,
      mobile_phone_bills: 0,
      electricity_bills: 0,
      water_bills: 0,
      ott_channels: 0,
      
      // Annual spends
      hotels_annual: 0,
      flights_annual: 0,
      insurance_health_annual: 0,
      insurance_car_or_bike_annual: 0,
      large_electronics_purchase_like_mobile_tv_etc: 0,
      
      // Other
      all_pharmacy: 0,
      
      // Placeholders
      new_monthly_cat_1: 0,
      new_monthly_cat_2: 0,
      new_monthly_cat_3: 0,
      new_cat_1: 0,
      new_cat_2: 0,
      new_cat_3: 0,
      
      selected_card_id: null,
      
      ...spendVector,
    };

    // Call API with retry logic
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(fullVector),
    });

    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }

    return await response.json();
  }

  /**
   * Fetch with exponential backoff retry for transient errors
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Retry on 5xx or 429
        if (response.status >= 500 || response.status === 429) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          
          // Wait with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Wait before retry
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<Error> {
    let errorData: any = null;

    try {
      errorData = await response.json();
    } catch {
      // Response not JSON
    }

    const message = errorData?.message || errorData?.error || response.statusText;
    const statusCode = response.status;

    switch (statusCode) {
      case 400:
        return new Error(`Invalid spend vector: ${message}`);
      case 401:
      case 403:
        return new Error('Authentication failed. Check partner token.');
      case 429:
        return new Error('Rate limit exceeded. Please try again later.');
      default:
        return new Error(`Calculator API error (${statusCode}): ${message}`);
    }
  }
}

/**
 * Singleton instance
 */
export const cgCalculatorClient = new CGCalculatorClient();
