#!/bin/sh
# Reword third commit (DesignerManufacturer sewing completion) - when message is supplier-manufacturer, replace with designer-manufacturer sewing completion
FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exec vi "$@"
fi
MSG=$(cat "$FILE")
if echo "$MSG" | grep -q "SupplierManufacturerContract" && echo "$MSG" | grep -q "shipment bundle"; then
  echo "Smart contract designer–manufacturer (DesignerManufacturerContract): sewing completion, price per piece, createSewingCompletion" > "$FILE"
fi
exit 0
