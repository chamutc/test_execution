import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';

import { csvAPI, apiUtils } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useQueryClient } from '@tanstack/react-query';
import { sessionKeys } from '../../hooks/useSessionsQuery';

const CSVImport = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResults, setValidationResults] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const { showSuccess, showError, showWarning } = useNotification();
  const queryClient = useQueryClient();

  const validateFile = (file) => {
    const errors = [];
    const warnings = [];

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      errors.push('File must be a CSV file (.csv extension)');
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push('File cannot be empty');
    }

    return { errors, warnings };
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
    // Reset input
    e.target.value = '';
  }, []);

  const handleFileUpload = async (file) => {
    // Validate file
    const validation = validateFile(file);
    if (validation.errors.length > 0) {
      showError(`File validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    if (validation.warnings.length > 0) {
      showWarning(`File warnings: ${validation.warnings.join(', ')}`);
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // First, validate the CSV content
      const formData = new FormData();
      formData.append('csvFile', file);

      const validationResponse = await csvAPI.validate(formData);
      const results = validationResponse.data;

      setValidationResults(results);

      if (results.errors && results.errors.length > 0) {
        showError(`CSV validation failed: ${results.errors.length} errors found`);
        setUploading(false);
        return;
      }

      // Show preview if validation passed
      if (results.preview) {
        // Preserve formData so Confirm Import can proceed
        setPreviewData({ ...results.preview, formData });
        setShowPreview(true);
      } else {
        // If no preview, proceed with upload
        await performUpload(formData);
      }

    } catch (error) {
      showError(`Validation failed: ${apiUtils.extractMessage(error)}`);
    } finally {
      setUploading(false);
    }
  };

  const performUpload = async (formData) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await csvAPI.upload(
        formData,
        apiUtils.createProgressHandler(setUploadProgress)
      );

      const results = response.data;
      setImportResults(results);
      setShowResults(true);

      // Refresh sessions data
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });

      if (results.success) {
        showSuccess(`Successfully imported ${results.imported} sessions`);
      } else {
        showWarning(`Import completed with issues: ${results.errors?.length || 0} errors`);
      }

    } catch (error) {
      showError(`Upload failed: ${apiUtils.extractMessage(error)}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await csvAPI.downloadTemplate('sessions');
      apiUtils.downloadFile(response.data, 'sessions_template.csv');
      showSuccess('Template downloaded successfully');
    } catch (error) {
      showError(`Failed to download template: ${apiUtils.extractMessage(error)}`);
    }
  };

  const handleConfirmImport = () => {
    setShowPreview(false);
    if (previewData && previewData.formData) {
      performUpload(previewData.formData);
    }
  };

  const handleCancelImport = () => {
    setShowPreview(false);
    setPreviewData(null);
    setValidationResults(null);
  };

  const renderValidationSummary = (results) => {
    if (!results) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Validation Results
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip
            icon={<SuccessIcon />}
            label={`${results.validRows || 0} Valid Rows`}
            color="success"
            variant="outlined"
          />
          {results.warnings && results.warnings.length > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${results.warnings.length} Warnings`}
              color="warning"
              variant="outlined"
            />
          )}
          {results.errors && results.errors.length > 0 && (
            <Chip
              icon={<ErrorIcon />}
              label={`${results.errors.length} Errors`}
              color="error"
              variant="outlined"
            />
          )}
        </Box>

        {results.errors && results.errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Errors found:
            </Typography>
            <List dense>
              {results.errors.slice(0, 5).map((error, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <ErrorIcon color="error" />
                  </ListItemIcon>
                  <ListItemText primary={error} />
                </ListItem>
              ))}
              {results.errors.length > 5 && (
                <ListItem>
                  <ListItemText primary={`... and ${results.errors.length - 5} more errors`} />
                </ListItem>
              )}
            </List>
          </Alert>
        )}

        {results.warnings && results.warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Warnings:
            </Typography>
            <List dense>
              {results.warnings.slice(0, 3).map((warning, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText primary={warning} />
                </ListItem>
              ))}
              {results.warnings.length > 3 && (
                <ListItem>
                  <ListItemText primary={`... and ${results.warnings.length - 3} more warnings`} />
                </ListItem>
              )}
            </List>
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'grey.300',
          backgroundColor: dragActive ? 'primary.50' : 'grey.50',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          textAlign: 'center',
          opacity: uploading ? 0.7 : 1,
          '&:hover': {
            borderColor: uploading ? 'grey.300' : 'primary.main',
            backgroundColor: uploading ? 'grey.50' : 'primary.50',
          },
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && document.getElementById('csvFileInput').click()}
      >
        <input
          id="csvFileInput"
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          disabled={uploading}
        />

        <UploadIcon
          sx={{
            fontSize: 48,
            color: dragActive ? 'primary.main' : 'grey.400',
            mb: 2,
          }}
        />

        <Typography variant="h6" gutterBottom>
          {uploading
            ? 'Processing...'
            : dragActive
              ? 'Drop CSV file here'
              : 'Drag & Drop CSV File Here'
          }
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          or <Button variant="text" component="span" disabled={uploading}>browse files</Button> to upload
        </Typography>

        <Typography variant="caption" color="text.secondary" display="block">
          Supported format: .csv files up to 10MB
        </Typography>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {uploadProgress}% uploaded
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Template Download */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={handleDownloadTemplate}
          disabled={uploading}
        >
          Download Template
        </Button>
        <Button
          startIcon={<InfoIcon />}
          variant="text"
          onClick={() => {
            showSuccess('CSV should contain columns: name, platform, debugger, os, priority, description, estimatedTime');
          }}
        >
          Format Info
        </Button>
      </Box>

      {/* Validation Results */}
      {validationResults && renderValidationSummary(validationResults)}

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={handleCancelImport}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PreviewIcon />
            Preview Import Data
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewData && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Preview of {previewData.totalRows} rows to be imported:
              </Typography>

              <TableContainer sx={{ maxHeight: 400, mt: 2 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {previewData.headers?.map((header, index) => (
                        <TableCell key={index} sx={{ fontWeight: 600 }}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.rows?.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {previewData.totalRows > 10 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Showing first 10 rows of {previewData.totalRows} total rows
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelImport}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmImport}
            variant="contained"
            disabled={uploading}
          >
            {uploading ? 'Importing...' : 'Confirm Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Results Dialog */}
      <Dialog
        open={showResults}
        onClose={() => setShowResults(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Import Results
        </DialogTitle>
        <DialogContent>
          {importResults && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip
                  icon={<SuccessIcon />}
                  label={`${importResults.imported || 0} Imported`}
                  color="success"
                />
                {importResults.skipped > 0 && (
                  <Chip
                    icon={<WarningIcon />}
                    label={`${importResults.skipped} Skipped`}
                    color="warning"
                  />
                )}
                {importResults.errors?.length > 0 && (
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${importResults.errors.length} Errors`}
                    color="error"
                  />
                )}
              </Box>

              {importResults.errors && importResults.errors.length > 0 && (
                <Alert severity="error">
                  <Typography variant="subtitle2" gutterBottom>
                    Import Errors:
                  </Typography>
                  <List dense>
                    {importResults.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={error} />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResults(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CSVImport;
