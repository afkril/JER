const V={pdf:'PdfViewer',docx:'WordViewer',doc:'WordViewer',rtf:'WordViewer',xlsx:'ExcelViewer',pptx:'PptxViewer',ppsx:'PptxViewer',ppt:'PptxViewer',xlsm:'ExcelViewer',xls:'SheetViewer',csv:'SheetViewer',tsv:'SheetViewer',ods:'SheetViewer',html:'HtmlViewer',htm:'HtmlViewer',jpg:'ImageViewer',jpeg:'ImageViewer',png:'ImageViewer',webp:'ImageViewer',svg:'ImageViewer'};
const T={txt:'',log:'',md:'markdown',js:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',css:'css',scss:'scss',json:'json',xml:'xml',php:'php',py:'python',java:'java',sql:'sql'};
export const PENDING=['odt','odp'];
export function detect(f){const ext=f.name.split('.').pop().toLowerCase();
 if(V[ext])return{ext,viewer:V[ext]};
 if(ext in T)return{ext,viewer:'TextViewer',lang:T[ext]};
 return{ext,viewer:null,pending:PENDING.includes(ext)}}
