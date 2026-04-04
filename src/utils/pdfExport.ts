import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToPDF = async (
  elementId: string, 
  collegeName: string, 
  campusName: string, 
  semesterType: string, 
  masterPlanFilter: string
) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // Ensure the element is visible and has dimensions
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      console.warn('Element dimensions are zero, waiting for layout...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Scroll to top to avoid capture issues with html2canvas
    const originalScrollY = window.scrollY;
    const originalScrollX = window.scrollX;
    window.scrollTo(0, 0);
    
    const parentElement = element.parentElement;
    const originalScrollLeft = parentElement ? parentElement.scrollLeft : 0;
    
    // Temporarily remove overflow constraints from parent to ensure full capture
    let originalParentOverflow = '';
    if (parentElement) {
      parentElement.scrollLeft = 0;
      originalParentOverflow = parentElement.style.overflow;
      parentElement.style.overflow = 'visible';
    }

    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // Let it expand naturally
          clonedElement.style.height = 'auto';
          clonedElement.style.maxHeight = 'none';
          clonedElement.style.overflow = 'visible';
          clonedElement.style.transform = 'none';
          
          // Remove border, shadow, and rounded corners for a cleaner PDF
          clonedElement.style.border = 'none';
          clonedElement.style.boxShadow = 'none';
          clonedElement.style.borderRadius = '0';
          clonedElement.style.padding = '20px'; // Consistent padding
          
          // Also ensure its parents in the clone don't clip it
          let parent = clonedElement.parentElement;
          while (parent) {
             parent.style.overflow = 'visible';
             parent.style.height = 'auto';
             parent.style.maxHeight = 'none';
             parent = parent.parentElement;
          }
          
          // Ensure body and html don't clip
          clonedDoc.body.style.overflow = 'visible';
          clonedDoc.documentElement.style.overflow = 'visible';
          clonedDoc.body.style.height = 'auto';
          clonedDoc.documentElement.style.height = 'auto';
        }
        // Remove elements with no-print class completely
        const noPrintElements = clonedDoc.getElementsByClassName('no-print');
        while(noPrintElements.length > 0) {
          noPrintElements[0].parentNode?.removeChild(noPrintElements[0]);
        }
      }
    });

    // Restore scroll and overflow
    window.scrollTo(originalScrollX, originalScrollY);
    if (parentElement) {
      parentElement.scrollLeft = originalScrollLeft;
      parentElement.style.overflow = originalParentOverflow;
    }

    const imgData = canvas.toDataURL('image/png', 1.0);
    
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    if (!imgWidth || !imgHeight) {
      throw new Error('Canvas dimensions are invalid after capture');
    }
    
    // Create PDF with exact canvas dimensions to eliminate empty space
    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgWidth, imgHeight]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, '', 'FAST');
    pdf.save(`Master_Plan_Sem_${semesterType}_${new Date().getFullYear()}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again or ensure the page is fully loaded.');
  }
};
