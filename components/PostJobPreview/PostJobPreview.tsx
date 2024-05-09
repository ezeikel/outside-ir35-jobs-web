import { useFormContext } from 'react-hook-form';
import HTMLViewer from '../HTMLViewer/HTMLViewer';

const JobPostPreview = () => {
  const { watch } = useFormContext();
  const {
    companyName,
    position,
    jobDescription,
    // TODO:
    // keywords,
    location,
    // companyLogo,
    // dayRate,
    // howToApply,
    // applicationEmail,
    // workMode,
    // companyTwitter,
    // companyEmail,
    // invoiceAddress,
  } = watch();

  return (
    <div className="bg-gray-100 p-4 rounded-lg editor-preview">
      <h2 className="text-xl font-bold mb-4">Job Preview</h2>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-bold">{position}</h3>
        <p className="text-gray-600 mb-2">{companyName}</p>
        <p className="text-gray-600 mb-4">{location.address}</p>
        <div>
          <HTMLViewer html={jobDescription} />
        </div>
        <p className="text-gray-700 mb-4">
          To apply, please send your resume to jobs@acmeinc.com.
        </p>
      </div>
    </div>
  );
};

export default JobPostPreview;
