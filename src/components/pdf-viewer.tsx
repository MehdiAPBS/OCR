"use client";

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from 'lucide-react';

interface PdfViewerProps {
  pdfUrl: string | null;
}

const PdfViewer: FC<PdfViewerProps> = ({ pdfUrl }) => {
  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          PDF Viewer
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="PDF Viewer"
            aria-label="PDF Document Viewer"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
            <FileText className="w-16 h-16 mb-4" />
            <p className="text-lg">Upload a PDF to view it here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfViewer;
