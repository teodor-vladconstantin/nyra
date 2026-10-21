"use client";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openTour } from "./product-tour";

export function ReplayTourButton() {
  return <Button type="button" variant="outline" onClick={openTour}><PlayCircle /> Reia turul</Button>;
}
