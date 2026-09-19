update payment_methods
set is_active = (code = 'WHATSAPP'),
    instructions = case
      when code = 'WHATSAPP' then 'Envía el resumen de tu compra directamente a DoraPass por WhatsApp.'
      else instructions
    end,
    sort_order = case when code = 'WHATSAPP' then 10 else sort_order end,
    updated_at = now()
where market_code in ('PE', 'BO');
