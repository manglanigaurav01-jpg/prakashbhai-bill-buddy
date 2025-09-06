import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Users, Plus, ArrowLeft, Calendar, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  getStaff, 
  saveStaff, 
  deleteStaff,
  saveAttendanceRecord, 
  getAttendanceByStaff,
  getStaffAttendanceSummary 
} from '@/lib/storage';
import { Staff, AttendanceRecord } from '@/types';

interface StaffAttendanceProps {
  onNavigate: (view: string) => void;
}

export const StaffAttendance = ({ onNavigate }: StaffAttendanceProps) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [attendanceDate, setAttendanceDate] = useState<Date>(new Date());
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent'>('present');
  const [regularHours, setRegularHours] = useState('8');
  const [regularMinutes, setRegularMinutes] = useState('0');
  const [extraHours, setExtraHours] = useState('0');
  const [extraMinutes, setExtraMinutes] = useState('0');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setStaff(getStaff());
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      setAttendanceHistory(getAttendanceByStaff(selectedStaff.id));
    }
  }, [selectedStaff]);

  const handleAddStaff = () => {
    if (!newStaffName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a staff name",
        variant: "destructive"
      });
      return;
    }

    const existingStaff = staff.find(s => s.name.toLowerCase() === newStaffName.toLowerCase());
    if (existingStaff) {
      toast({
        title: "Error",
        description: "Staff member already exists",
        variant: "destructive"
      });
      return;
    }

    const newStaff = saveStaff({ name: newStaffName.trim() });
    setStaff([...staff, newStaff]);
    setNewStaffName('');
    
    toast({
      title: "Success",
      description: `${newStaff.name} added successfully`
    });
  };

  const handleDeleteStaff = (staffToDelete: Staff) => {
    if (confirm(`Are you sure you want to delete ${staffToDelete.name}? This will also delete all attendance records for this staff member.`)) {
      deleteStaff(staffToDelete.id);
      setStaff(staff.filter(s => s.id !== staffToDelete.id));
      if (selectedStaff?.id === staffToDelete.id) {
        setSelectedStaff(null);
        setAttendanceHistory([]);
      }
      
      toast({
        title: "Success",
        description: `${staffToDelete.name} deleted successfully`
      });
    }
  };

  const handleSaveAttendance = () => {
    if (!selectedStaff) {
      toast({
        title: "Error",
        description: "Please select a staff member",
        variant: "destructive"
      });
      return;
    }

    const dateStr = attendanceDate.toISOString().split('T')[0];
    const existingRecord = attendanceHistory.find(record => 
      record.date.split('T')[0] === dateStr
    );

    if (existingRecord) {
      toast({
        title: "Error",
        description: "Attendance already recorded for this date",
        variant: "destructive"
      });
      return;
    }

    const totalRegularHours = parseInt(regularHours) + (parseInt(regularMinutes) / 60);
    const totalExtraHours = parseInt(extraHours) + (parseInt(extraMinutes) / 60);

    const attendanceRecord = saveAttendanceRecord({
      staffId: selectedStaff.id,
      staffName: selectedStaff.name,
      date: attendanceDate.toISOString(),
      status: attendanceStatus,
      regularHours: totalRegularHours,
      extraHours: totalExtraHours
    });

    setAttendanceHistory([attendanceRecord, ...attendanceHistory]);
    
    // Reset form
    setAttendanceStatus('present');
    setRegularHours('8');
    setRegularMinutes('0');
    setExtraHours('0');
    setExtraMinutes('0');
    setAttendanceDate(new Date());

    toast({
      title: "Success",
      description: "Attendance recorded successfully"
    });
  };

  const formatTime = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getAttendanceSummary = () => {
    if (!selectedStaff) return null;
    return getStaffAttendanceSummary(selectedStaff.id);
  };

  const summary = getAttendanceSummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft to-accent-soft p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Staff Attendance</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Staff Management & Attendance Form */}
          <div className="space-y-6">
            {/* Add Staff Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Staff
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter staff name"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddStaff()}
                    className="flex-1"
                  />
                  <Button onClick={handleAddStaff}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                {/* Staff List */}
                {staff.length > 0 && (
                  <div className="space-y-2">
                    <Label>Current Staff Members:</Label>
                    <ScrollArea className="h-32 w-full border rounded-md p-2">
                      {staff.map((staffMember) => (
                        <div key={staffMember.id} className="flex items-center justify-between py-1">
                          <span className="text-sm">{staffMember.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStaff(staffMember)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Staff Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Staff Member</CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  value={selectedStaff?.id || ""} 
                  onValueChange={(value) => {
                    const staff = getStaff().find(s => s.id === value);
                    setSelectedStaff(staff || null);
                    setShowHistory(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((staffMember) => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Attendance Form */}
            {selectedStaff && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Mark Attendance - {selectedStaff.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <DatePicker
                      date={attendanceDate}
                      onDateChange={(date) => setAttendanceDate(date || new Date())}
                      placeholder="Select date"
                    />
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-2">
                    <Label>Attendance Status</Label>
                    <RadioGroup 
                      value={attendanceStatus} 
                      onValueChange={(value) => setAttendanceStatus(value as 'present' | 'absent')}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="present" id="present" />
                        <Label htmlFor="present" className="text-green-600 font-medium">Present</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="absent" id="absent" />
                        <Label htmlFor="absent" className="text-red-600 font-medium">Absent</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Time Inputs - only show if present */}
                  {attendanceStatus === 'present' && (
                    <>
                      {/* Regular Hours */}
                      <div className="space-y-2">
                        <Label>Regular Working Time</Label>
                        <div className="flex gap-2 items-center">
                          <Select value={regularHours} onValueChange={setRegularHours}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 13 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>{i}h</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={regularMinutes} onValueChange={setRegularMinutes}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0m</SelectItem>
                              <SelectItem value="15">15m</SelectItem>
                              <SelectItem value="30">30m</SelectItem>
                              <SelectItem value="45">45m</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Extra Hours */}
                      <div className="space-y-2">
                        <Label>Extra Time (Overtime)</Label>  
                        <div className="flex gap-2 items-center">
                          <Select value={extraHours} onValueChange={setExtraHours}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 13 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>{i}h</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={extraMinutes} onValueChange={setExtraMinutes}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0m</SelectItem>
                              <SelectItem value="15">15m</SelectItem>
                              <SelectItem value="30">30m</SelectItem>
                              <SelectItem value="45">45m</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}

                  <Button onClick={handleSaveAttendance} className="w-full">
                    Save Attendance
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Summary & History */}
          {selectedStaff && (
            <div className="space-y-6">
              {/* Attendance Summary */}
              {summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Attendance Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{summary.presentDays}</div>
                        <div className="text-sm text-green-700">Present Days</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{summary.absentDays}</div>
                        <div className="text-sm text-red-700">Absent Days</div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Attendance Rate:</span>
                        <Badge variant={summary.attendanceRate >= 90 ? "default" : "destructive"}>
                          {summary.attendanceRate}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Regular Hours:</span>
                        <span className="font-medium">{formatTime(summary.totalRegularHours)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Extra Hours:</span>
                        <span className="font-medium">{formatTime(summary.totalExtraHours)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attendance History */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 w-full">
                    {attendanceHistory.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No attendance records found
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {attendanceHistory.slice(0, 10).map((record) => (
                          <div key={record.id} className="p-3 border rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">
                                {new Date(record.date).toLocaleDateString()}
                              </span>
                              <Badge 
                                variant={record.status === 'present' ? "default" : "destructive"}
                              >
                                {record.status}
                              </Badge>
                            </div>
                            {record.status === 'present' && (
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>Regular: {formatTime(record.regularHours)}</div>
                                {record.extraHours > 0 && (
                                  <div>Extra: {formatTime(record.extraHours)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};