"use client";

import type { FC } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3 } from 'lucide-react';

interface DataEditorProps {
  data: Record<string, any> | null;
  onDataChange: (updatedData: Record<string, any>) => void;
}

const DataEditor: FC<DataEditorProps> = ({ data, onDataChange }) => {
  const handleChange = (key: string, newValue: string, isJson: boolean) => {
    if (!data) return;

    const updated = { ...data };
    if (isJson) {
      try {
        // Allow user to type partial/invalid JSON without crashing,
        // actual parsing happens when downloading or further processing.
        updated[key] = JSON.parse(newValue); // Attempt to parse for immediate feedback if possible
      } catch (e) {
        // If JSON is invalid during typing, store the raw string.
        // The parent component or download function will need to validate.
        updated[key] = newValue; // Store as string if parse fails
      }
    } else {
      const originalValue = data[key];
      if (typeof originalValue === 'number') {
        const parsedFloat = parseFloat(newValue);
        updated[key] = isNaN(parsedFloat) ? newValue : parsedFloat;
      } else if (typeof originalValue === 'boolean') {
        updated[key] = newValue.toLowerCase() === 'true';
      } else {
        updated[key] = newValue;
      }
    }
    onDataChange(updated);
  };

  const getDisplayValue = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === null || value === undefined) return '';
    // If it's an object that was previously stringified due to invalid JSON, show that string
    // otherwise stringify the object.
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-primary" />
          Extracted Data
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {!data ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Edit3 className="w-16 h-16 mb-4" />
            <p className="text-lg">Extracted data will appear here for editing.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="text-base font-semibold text-foreground">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </Label>
                {typeof value === 'object' && value !== null && typeof value !== 'string' ? (
                  <Textarea
                    id={key}
                    value={getDisplayValue(value)}
                    onChange={(e) => handleChange(key, e.target.value, true)}
                    className="font-mono text-sm rounded-md shadow-sm min-h-[100px]"
                    rows={Math.min(10, getDisplayValue(value).split('\n').length)}
                    aria-label={`Edit ${key} JSON data`}
                  />
                ) : (
                  <Input
                    id={key}
                    value={getDisplayValue(value)}
                    onChange={(e) => handleChange(key, e.target.value, false)}
                    className="text-sm rounded-md shadow-sm"
                    aria-label={`Edit ${key} value`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataEditor;
