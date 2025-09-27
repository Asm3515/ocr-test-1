export type CurrencyCode = "USD";

/** Individual line item within an invoice */
export interface LineItem {
  item: string;              
  quantity: number;          
  unitPrice: number;         
  currency: CurrencyCode;    
  totalPrice?: number;       
}

/** Main invoice document structure */
export interface InvoiceDoc {
  _id?: string;

  vendor: string;            
  amount: number;            
  currency: CurrencyCode;    
  date: string;              
  invoiceNumber?: string;    

  description?: string;      
  summary?: string;          

  tags: string[];            
  category?: string;         

  lineItems?: LineItem[];    

  embedding?: number[];      

  filename?: string;         
  uploadedAt: Date;          
  processed: boolean;        
}
