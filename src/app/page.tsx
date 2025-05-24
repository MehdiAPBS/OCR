
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import PdfViewer from "@/components/pdf-viewer";
import DataEditor from "@/components/data-editor";
import { extractDataFromPdf, type ExtractDataFromPdfOutput, type ExtractDataFromPdfInput } from "@/ai/flows/extract-data-from-pdf";
import { saveToGoogleSheet, type SaveToGoogleSheetOutput, type SaveToGoogleSheetInput } from "@/ai/flows/save-to-google-sheet";
import type { ExtractedPdfData } from "@/ai/schemas/pdf-data-schema";
import { useToast } from "@/hooks/use-toast";
import { Cpu, FileJson, Loader2, AlertTriangle, Database, Sheet as SheetIcon, Settings2, ArrowLeft, ArrowRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ThemeToggleButton } from '@/components/theme-toggle-button';


type ExtractionEngine = ExtractDataFromPdfInput['extractionEngine'];

interface ProcessedPdfEntry {
  file: File;
  documentInstanceId: string;
}

export default function PdfExtractorPage() {
  const [processedEntries, setProcessedEntries] = useState<ProcessedPdfEntry[]>([]);
  const [currentPdfIndex, setCurrentPdfIndex] = useState<number>(0);
  const [allProcessedData, setAllProcessedData] = useState<(ExtractedPdfData | null)[]>([]);


  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);

  const [currentExtractedData, setCurrentExtractedData] = useState<ExtractedPdfData | null>(null);

  const [extractionEngine, setExtractionEngine] = useState<ExtractionEngine>('genkitDirect');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSavingToMongoDb, setIsSavingToMongoDb] = useState<boolean>(false);
  const [isSavingToSheet, setIsSavingToSheet] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const currentUrl = pdfObjectUrl;
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [pdfObjectUrl]);

  const loadPdfAtIndex = (index: number, entries: ProcessedPdfEntry[] = processedEntries, data: (ExtractedPdfData | null)[] = allProcessedData) => {
    if (pdfObjectUrl) { 
      URL.revokeObjectURL(pdfObjectUrl);
      setPdfObjectUrl(null);
    }

    if (entries.length === 0 && index === 0) {
      setPdfDataUri(null);
      setCurrentExtractedData(null);
      setError(null);
      return;
    }

    if (index >= 0 && index < entries.length) {
      const entry = entries[index];
      const newObjectUrl = URL.createObjectURL(entry.file);
      setPdfObjectUrl(newObjectUrl);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPdfDataUri(reader.result as string);
      };
      reader.onerror = () => {
        setError(`Error reading file: ${entry.file.name}`);
        setPdfDataUri(null);
      }
      reader.readAsDataURL(entry.file);

      setCurrentExtractedData(data[index] || null);
      setError(null); 
    } else {
      setPdfDataUri(null);
      setCurrentExtractedData(null);
      setError(null);
      if (entries.length > 0 && index >= entries.length) {
        toast({
          title: "All PDFs Processed",
          description: "You have reached the end of the PDF queue.",
        });
      }
    }
  };

  const advanceToNextPdf = () => {
    const newIndex = currentPdfIndex + 1;
    setCurrentPdfIndex(newIndex);
    if (newIndex < processedEntries.length) {
      loadPdfAtIndex(newIndex, processedEntries, allProcessedData);
    } else {
      loadPdfAtIndex(newIndex, processedEntries, allProcessedData); 
      toast({
        title: "Queue Finished",
        description: "All PDFs in the queue have been processed and saved (or viewed).",
      });
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPdfFiles = Array.from(files).filter(file => file.type === "application/pdf");
      if (newPdfFiles.length > 0) {
        const newEntries: ProcessedPdfEntry[] = newPdfFiles.map(file => ({
          file,
          documentInstanceId: uuidv4(), 
        }));
        const newAllData = new Array(newPdfFiles.length).fill(null); 

        setProcessedEntries(newEntries);
        setAllProcessedData(newAllData);
        setCurrentPdfIndex(0); 
        loadPdfAtIndex(0, newEntries, newAllData);
        setError(null);
      } else {
        setProcessedEntries([]);
        setAllProcessedData([]);
        setCurrentPdfIndex(0);
        loadPdfAtIndex(0, [], []); 
        setError("Please select valid PDF files.");
        toast({ title: "Invalid Files", description: "No valid PDF files were selected.", variant: "destructive" });
      }
    } else {
      setProcessedEntries([]);
      setAllProcessedData([]);
      setCurrentPdfIndex(0);
      loadPdfAtIndex(0, [], []);
      setError(null);
    }
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleProcessPdf = async () => {
    if (!pdfDataUri || currentPdfIndex >= processedEntries.length) {
      setError("Please select a PDF file from the queue to process.");
      toast({
        title: "No PDF Ready",
        description: "No PDF is currently loaded for processing or queue is finished.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const inputArgs: ExtractDataFromPdfInput = { pdfDataUri, extractionEngine };
      const result: ExtractDataFromPdfOutput = await extractDataFromPdf(inputArgs);

      if (result && result.error) {
        console.error("Error from AI flow:", result.error, "Full result object:", result);
        const displayError = `AI Flow Error: ${result.error}`;
        setError(displayError);
        setCurrentExtractedData(allProcessedData[currentPdfIndex] || null); 
        toast({ title: "Extraction Failed", description: displayError, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (result && result.jsonOutput && result.jsonOutput.trim() !== '' && result.jsonOutput.trim() !== '{}') {
        try {
          const parsedData: ExtractedPdfData = JSON.parse(result.jsonOutput);
          setCurrentExtractedData(parsedData);
          setAllProcessedData(prevAllData => {
            const newAllData = [...prevAllData];
            newAllData[currentPdfIndex] = parsedData;
            return newAllData;
          });
          toast({
            title: "Data Extracted",
            description: `Data extracted for ${processedEntries[currentPdfIndex]?.file.name || 'current PDF'}.`,
          });
        } catch (parseError: any) {
          console.error("Error parsing AI output as JSON:", parseError, "Raw output:", result.jsonOutput);
          const displayError = "Failed to parse AI output. The AI returned an unexpected format.";
          setError(displayError);
          setCurrentExtractedData(allProcessedData[currentPdfIndex] || null);
          toast({ title: "Parsing Failed", description: displayError, variant: "destructive" });
        }
      } else {
        let errorMessage = "AI did not return expected data format or returned empty/default data.";
         if (!result) errorMessage = "No response from AI service.";
         else if (!result.jsonOutput) errorMessage = "AI response missing 'jsonOutput' field.";
         else if (result.jsonOutput.trim() === '' || result.jsonOutput.trim() === '{}') {
            errorMessage = "AI returned empty/default data. Review PDF content or prompt if fields are unexpectedly empty.";
         }
        console.warn("Problematic AI Result:", errorMessage, "Full result object:", result);
        setError(errorMessage);
        try {
          const parsedData: ExtractedPdfData | null = result && result.jsonOutput ? JSON.parse(result.jsonOutput) : null;
          setCurrentExtractedData(parsedData);
           setAllProcessedData(prevAllData => {
            const newAllData = [...prevAllData];
            newAllData[currentPdfIndex] = parsedData;
            return newAllData;
          });
          if (parsedData) { 
            toast({
              title: "Extraction Note",
              description: "AI processed the PDF but returned default/empty values for some or all fields. Data is shown for review.",
              variant: "default" 
            });
          }
        } catch (e) {
           console.error("Error parsing even default AI output:", e, "Raw output:", result?.jsonOutput);
           setCurrentExtractedData(allProcessedData[currentPdfIndex] || null); 
        }
      }
    } catch (err: any) {
      console.error("Error processing PDF in client:", err);
      const errorMessage = err.message || "An unknown error occurred during PDF processing.";
      setError(errorMessage);
      setCurrentExtractedData(allProcessedData[currentPdfIndex] || null);
      toast({ title: "Processing Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataChange = (updatedData: ExtractedPdfData) => {
    setCurrentExtractedData(updatedData);
    setAllProcessedData(prevAllData => {
      const newAllData = [...prevAllData];
      if (currentPdfIndex >= 0 && currentPdfIndex < newAllData.length) {
        newAllData[currentPdfIndex] = updatedData;
      }
      return newAllData;
    });
  };

  const handleDownloadJson = () => {
    const dataToDownload = allProcessedData[currentPdfIndex]; 
    if (!dataToDownload) {
      toast({
        title: "No Data",
        description: "There is no data for the current PDF to download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const jsonString = JSON.stringify(dataToDownload, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const currentFile = processedEntries[currentPdfIndex]?.file;
      a.download = `${currentFile?.name.replace(/\.pdf$/i, '') || 'extracted_data'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Download Started",
        description: "Your JSON file is downloading.",
      });
    } catch (e: any) {
        console.error("Error preparing JSON for download:", e);
        toast({
            title: "Download Error",
            description: "Could not prepare data for download. Ensure data is valid JSON.",
            variant: "destructive",
        });
    }
  };

  const handleSaveToMongoDb = async () => {
    const currentEntry = processedEntries[currentPdfIndex];
    const dataToSave = allProcessedData[currentPdfIndex]; 

    if (!dataToSave) {
      toast({
        title: "No Data",
        description: "There is no extracted data for the current PDF to save.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingToMongoDb(true);
    try {
      const response = await fetch('/api/save-to-mongodb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Saved to MongoDB",
          description: `${result.message} (ID: ${result.recordId || 'N/A'}) for ${currentEntry?.file.name || 'current PDF'}.`,
        });
        advanceToNextPdf(); 
      } else {
        toast({
          title: "MongoDB Save Failed",
          description: result.message || "An unknown error occurred while saving via API.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error saving to MongoDB via API:", err);
      toast({
        title: "MongoDB Save Error",
        description: err.message || "An unknown network or client-side error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSavingToMongoDb(false);
    }
  };

  const handleSaveToSheet = async () => {
    const currentEntry = processedEntries[currentPdfIndex];
    const dataToSave = allProcessedData[currentPdfIndex]; 
    const docInstanceId = currentEntry?.documentInstanceId;

    if (!dataToSave || !docInstanceId) {
      toast({
        title: "No Data",
        description: "There is no extracted data or document ID for the current PDF to save to Google Sheet.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingToSheet(true);
    try {
      const input: SaveToGoogleSheetInput = { extractedData: dataToSave, documentInstanceId: docInstanceId };
      const result: SaveToGoogleSheetOutput = await saveToGoogleSheet(input);

      if (result.success) {
        toast({
          title: "Saved to Google Sheet",
          description: `${result.message} for ${currentEntry?.file.name || 'current PDF'}.`,
        });
        advanceToNextPdf(); 
      } else {
        toast({
          title: "Google Sheet Save Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error saving to Google Sheet via Genkit flow:", err);
      toast({
        title: "Google Sheet Save Error",
        description: err.message || "An unknown error occurred during the Genkit flow.",
        variant: "destructive",
      });
    } finally {
      setIsSavingToSheet(false);
    }
  };

  const handlePreviousPdf = () => {
    if (currentPdfIndex > 0) {
      const newIndex = currentPdfIndex - 1;
      setCurrentPdfIndex(newIndex);
      loadPdfAtIndex(newIndex, processedEntries, allProcessedData);
    }
  };

  const handleNextPdf = () => {
    if (currentPdfIndex < processedEntries.length) {
      const newIndex = currentPdfIndex + 1;
      setCurrentPdfIndex(newIndex);
      loadPdfAtIndex(newIndex, processedEntries, allProcessedData);
    }
  };

  const canProcess = processedEntries.length > 0 && currentPdfIndex < processedEntries.length;
  const isAnySavingInProgress = isSavingToMongoDb || isSavingToSheet;
  const isAnyOperationInProgress = isLoading || isAnySavingInProgress;

  const processPdfDisabled = isAnyOperationInProgress || !canProcess;

  const actionButtonsDisabled = !currentExtractedData || isAnyOperationInProgress;

  const prevButtonDisabled = currentPdfIndex === 0 || isAnyOperationInProgress || processedEntries.length === 0;

  const nextButtonDisabled = currentPdfIndex >= processedEntries.length || isAnyOperationInProgress || processedEntries.length === 0;


  const currentFile = processedEntries[currentPdfIndex]?.file;

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 md:p-8 selection:bg-primary/20">
      <header className="mb-8 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center gap-4 mb-4 sm:mb-0">
          <Image
            src="https://placehold.co/64x64.png"
            alt="Polygon University Logo Placeholder"
            width={64}
            height={64}
            data-ai-hint="university logo gold"
            className="rounded-sm"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
            PDF Data Extractor
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggleButton />
        </div>
      </header>
      <p className="text-center text-muted-foreground text-lg mb-8 -mt-4 sm:mt-0">
          Upload PDF(s), extract data using AI, edit, and save.
      </p>


      <div className="mb-8 p-6 bg-card rounded-xl shadow-xl border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
            <Label htmlFor="pdf-upload" className="text-lg font-medium mb-2 block text-foreground">
              Upload PDF Document(s)
            </Label>
            <div className="flex items-center space-x-3">
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                multiple 
                onChange={handleFileChange}
                className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                aria-label="Upload PDF Documents"
              />
            </div>
            {processedEntries.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                 <Button
                    onClick={handlePreviousPdf}
                    disabled={prevButtonDisabled}
                    variant="outline"
                    size="icon"
                    aria-label="Previous PDF"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                <p className="text-sm text-muted-foreground truncate max-w-xs" title={currentFile?.name}>
                  {currentPdfIndex < processedEntries.length ? (
                    <>Current: <span className="font-medium text-foreground">{currentFile?.name}</span> ({currentPdfIndex + 1} of {processedEntries.length})</>
                  ) : (
                     processedEntries.length > 0 ? <span className="text-green-600 font-medium">All {processedEntries.length} PDFs viewed. Queue finished.</span> : "No PDFs in queue."
                  )}
                </p>
                 <Button
                    onClick={handleNextPdf}
                    disabled={nextButtonDisabled}
                    variant="outline"
                    size="icon"
                    aria-label="Next PDF"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
              </div>
            )}
            {processedEntries.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                No PDF files selected.
              </p>
            )}
          </div>
          <div className="space-y-3">
            <Label className="text-lg font-medium mb-2 block text-foreground">
              <Settings2 className="inline-block mr-2 h-5 w-5 text-primary" />
              Extraction Engine
            </Label>
            <RadioGroup
              value={extractionEngine}
              onValueChange={(value: string) => setExtractionEngine(value as ExtractionEngine)}
              className="flex flex-col sm:flex-row gap-2 sm:gap-4"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-accent/10 transition-colors cursor-pointer has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="genkitDirect" id="genkitDirect" />
                <Label htmlFor="genkitDirect" className="font-normal text-sm cursor-pointer">Genkit Direct AI</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-accent/10 transition-colors cursor-pointer has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="googleCloudVision" id="googleCloudVision" />
                <Label htmlFor="googleCloudVision" className="font-normal text-sm cursor-pointer">Google Cloud Vision OCR + AI</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
         <div className="mt-6 flex flex-col md:flex-row gap-3 items-center flex-wrap">
            <Button
                onClick={handleProcessPdf}
                disabled={processPdfDisabled}
                className="bg-accent hover:bg-accent/90 text-accent-foreground min-w-[150px] w-full md:w-auto transition-all duration-150 ease-in-out transform active:scale-95"
                aria-label="Process PDF for data extraction"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Cpu className="mr-2 h-5 w-5" />
                )}
                {isLoading ? "Processing..." : (canProcess ? `Process PDF ${currentPdfIndex + 1}` : "Process PDF")}
              </Button>
            {currentExtractedData && (
             <>
                <Button
                    onClick={handleDownloadJson}
                    disabled={actionButtonsDisabled}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/5 hover:text-primary min-w-[150px] w-full md:w-auto transition-all duration-150 ease-in-out"
                    aria-label="Download extracted data as JSON"
                >
                    <FileJson className="mr-2 h-5 w-5" />
                    Download JSON
                </Button>
                <Button
                    onClick={handleSaveToMongoDb}
                    disabled={actionButtonsDisabled}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-500/10 hover:text-green-700 min-w-[150px] w-full md:w-auto transition-all duration-150 ease-in-out"
                    aria-label="Save extracted data to MongoDB"
                >
                    {isSavingToMongoDb ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <Database className="mr-2 h-5 w-5" />
                    )}
                    {isSavingToMongoDb ? "Saving..." : "Save to DB"}
                </Button>
                <Button
                    onClick={handleSaveToSheet}
                    disabled={actionButtonsDisabled}
                    variant="outline"
                    className="border-blue-500 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600 min-w-[150px] w-full md:w-auto transition-all duration-150 ease-in-out"
                    aria-label="Save extracted data to Google Sheet"
                >
                    {isSavingToSheet ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <SheetIcon className="mr-2 h-5 w-5" />
                    )}
                    {isSavingToSheet ? "Saving..." : "Save to Sheet"}
                </Button>
            </>
          )}
        </div>
        {error && (
          <Alert variant="destructive" className="mt-6 shadow-md">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <section className="h-[calc(100vh-350px)] min-h-[450px] rounded-xl overflow-hidden border border-border bg-card">
          <PdfViewer pdfUrl={pdfObjectUrl} />
        </section>
        <section className="h-[calc(100vh-350px)] min-h-[450px] rounded-xl overflow-hidden border border-border bg-card">
          <DataEditor data={currentExtractedData} onDataChange={handleDataChange} />
        </section>
      </main>
      <footer className="mt-12 py-6 text-center text-muted-foreground text-sm">
        <p>© Copyright reserved to Polygon University</p>
      </footer>
    </div>
  );
}
